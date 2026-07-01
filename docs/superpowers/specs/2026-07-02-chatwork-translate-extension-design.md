# Chatwork Translate Extension — Design

## Purpose

A Manifest V3 Chrome extension that provides **two-way translation** inside Chatwork
(`chatwork.com`): translate incoming messages for reading, and translate outgoing
drafts before sending. Built so the translation engine and the site logic are
isolated, allowing new engines and new sites to be added later without touching
the core.

## Scope (v1)

- **In scope:** Chatwork only; two-way translation via the keyless Google Translate
  web endpoint; auto-detect source language; configurable target language.
- **Out of scope (v1):** other websites, other translation engines, selection
  translation on arbitrary pages. Architecture leaves clean extension points for
  these but does not implement them.

## Key Decisions

| Topic | Decision |
|---|---|
| Platform | Chrome MV3 extension, `host_permissions` limited to `*://*.chatwork.com/*` |
| Engine | Google Translate web endpoint (no API key), isolated in one module |
| Languages | Auto-detect source; target configurable in popup (per direction) |
| Incoming UX | Toggle: ON = auto-translate incoming; OFF = per-message "Translate" button |
| Outgoing UX | "Translate" button near compose box → preview → apply. **Never auto-sends** |
| Site coupling | All Chatwork selectors isolated in one adapter file |
| CW markup | Tokenize mentions `[To:]`, emoji, links out before translating; re-insert after |

## Architecture

Four separated layers, one responsibility each. Content script touches the DOM;
all translation calls go through the background worker.

```
chrome_ext/
├── manifest.json              # MV3, host_permissions: chatwork.com, storage
├── src/
│   ├── background/
│   │   └── service-worker.js   # translate proxy, cache, rate-limit
│   ├── content/
│   │   ├── index.js            # entry: pick adapter by hostname, start observer
│   │   ├── observer.js         # MutationObserver: detect new messages, compose box
│   │   └── ui.js               # inject Translate button, translation block, preview
│   ├── adapters/
│   │   ├── adapter.js          # shared contract (base class)
│   │   └── chatwork.js         # SELECTORS + Chatwork-specific logic (fragile, isolated)
│   ├── translate/
│   │   └── google.js           # engine: translate(text, target) → {text, detectedLang}
│   ├── shared/
│   │   ├── messaging.js        # content ↔ background message protocol
│   │   └── settings.js         # chrome.storage read/write (target lang, toggle)
│   └── popup/
│       ├── popup.html          # settings: target language, auto-translate toggle
│       └── popup.js
```

### Boundary rules

- `adapters/chatwork.js` is the **only** place with DOM selectors → one file to fix
  when Chatwork changes its UI.
- `translate/google.js` is the **only** place that knows about Google → adding
  DeepL/LLM later means adding a file, not editing callers.
- Content script **never** calls Google directly (avoids CORS, centralizes
  rate-limit) → always via background.
- Each file stays ≤ 500 lines; observer/ui/adapter are pre-split so they don't grow.

### Extension points

- New site = add `adapters/<site>.js` + register its hostname.
- New engine = add `translate/<engine>.js`.

## Data Flow

### Incoming (reading)

```
MutationObserver detects new message node
   → adapter.extractMessages(node) → [{ id, textEl, rawText, isOwn }]
   → toggle ON: translate now  |  toggle OFF: inject "Translate" button, wait
   → content → background: { type:'TRANSLATE', text, target }
   → background: cache check → miss → google.translate()
   → { translatedText, detectedLang }
   → ui.renderTranslation(textEl, ...) → translation block BELOW original
```

- **Dedupe:** mark each original with `data-cw-translated`; dedupe key = message id
  + text hash (edited messages re-translate).
- **Skip own messages:** `isOwn` filtered (configurable).
- **Observer-loop guard (top risk):** our injected translation nodes are flagged and
  filtered via `isTranslationArtifact()`; processing is debounced (~150ms). Without
  this, translating our own translation → infinite loop.

### Outgoing (composing)

```
User types → clicks "Translate" (near compose box)
   → adapter.getComposeText() → rawText
   → content → background: { type:'TRANSLATE', text, target }
   → ui.showComposePreview(translatedText)   ← PREVIEW to review/edit
   → "Apply" → adapter.setComposeText(...)   |   "Cancel" → no change
   → user clicks Chatwork's own Send   (extension NEVER sends)
```

- Extension only *fills* the compose box; it never clicks Send — avoids sending a
  wrong translation.

### Background: cache + rate-limit

- **Cache:** in-memory `hash(text+target) → translatedText`, TTL ~1h.
- **Rate-limit:** sequential queue + min gap between requests (~200ms) + length caps.
  Required because the endpoint is unofficial.
- **Errors:** failed/timeout request → `{error}`; UI shows a retry affordance instead
  of breaking the chat.

## Adapter Contract

Content script calls only through this contract; it never touches selectors directly.

| Method | Returns / Effect |
|---|---|
| `matches(hostname)` | boolean — does this adapter apply |
| `getMessageContainer()` | Element\|null — root for MutationObserver |
| `extractMessages(root)` | `[{ id, textEl, rawText, isOwn }]` |
| `getMessageId(node)` | stable id for dedupe (real CW id, fallback hash) |
| `isTranslationArtifact(node)` | boolean — is this a translation node we injected |
| `mountIncomingTranslation(textEl, html)` | insert translation block below original |
| `getComposeElement()` | Element\|null — compose box |
| `getComposeText()` | string |
| `setComposeText(text)` | fill compose box, dispatching correct events |
| `getComposeToolbar()` | Element\|null — anchor for outgoing Translate button |

### Isolation of fragile parts

- All CSS selectors live in one `SELECTORS = {...}` object at the top of `chatwork.js`.
- **Defensive selectors:** each has a primary + fallback (`[data-testid]` → class →
  relative DOM). Both fail → warn + don't crash.
- **Health-check** on startup: if core selectors don't match, popup warns
  "Chatwork UI may have changed" instead of failing silently.

### Compose-box caveat

Chatwork's compose box is a rich/`contenteditable` editor, not a plain `<textarea>`.
`setComposeText` must set content correctly, dispatch an `input` event so the internal
framework updates state, and preserve cursor/Send-button state. This is verified
against the live site early in the plan.

### Selector status

Concrete selectors (class names, `data-*`) are **not yet determined** — the live
Chatwork DOM has not been surveyed (requires login). The contract above is stable;
real selectors are filled in the first plan step, run on the user's machine, and
captured as an HTML fixture for adapter tests.

## Error Handling & Edge Cases

### Engine errors

| Situation | Handling |
|---|---|
| Timeout / offline | retry once w/ backoff → fail → "Translate error — Retry"; original intact |
| Rate-limited (429/403) | pause queue, widen gap; popup "Being rate-limited, slowing down" |
| Response format changed | defensive parse; parse fail → treat as error, no crash |
| Empty / emoji-only / URL-only | skip, don't call (save quota) |
| Already target language | `detectedLang === target` → don't show translation |

### DOM / adapter errors

| Situation | Handling |
|---|---|
| Selector mismatch (UI changed) | startup health-check → popup warning; per-op fail → log + skip |
| `getComposeElement()` null | outgoing Translate button disabled + tooltip |
| `setComposeText` didn't take | read back to verify; mismatch → warn "copy manually", keep preview |
| Room switch (SPA swaps container) | observer re-attaches via `getMessageContainer()` |

### Chatwork / translation edge cases

- **Observer loop (risk #1):** guarded by `isTranslationArtifact()` + `data-cw-translated`
  + debounce.
- **Edited/deleted messages:** dedupe key includes text hash → edits re-translate.
- **Mentions `[To:]`, emoji, links:** tokenized out to placeholders before translation,
  re-inserted after, so CW markup is never mangled. Tokenizer is a dedicated,
  well-tested unit.
- **Lazy-load / scroll history:** only auto-translate **new real-time** messages; old
  messages loaded on scroll show the Translate button instead (avoids request storm).

### Privacy & scope

- `host_permissions` only `*://*.chatwork.com/*`.
- Only message text is sent to Google Translate (the feature itself); nothing else is
  collected or sent. Stated in README + popup.
- Never touches Chatwork cookies/tokens/login.

## Testing Strategy

### Automated unit tests (no browser)

Vitest, pure logic, `chrome`/`fetch` mocked:

| Module | Cases |
|---|---|
| `translate/google.js` | parse response; error/empty → throw; empty text → skip |
| `shared/settings.js` | defaults; migrate missing fields |
| **tokenizer** | split `[To:]`/emoji/URL → placeholder → re-join; adjacent tokens; no tokens |
| background cache/rate-limit | cache hit skips call; queue spacing; 429 widens gap |
| dedupe | same id+text → skip; same id+diff text → re-translate; artifact filtered |

### Adapter tests (jsdom + fixture)

jsdom + real Chatwork DOM saved as an HTML fixture (captured in plan step 1):
`extractMessages`, `getMessageId`, `isOwn`, `setComposeText` event dispatch (spy).
Only trustworthy once the fixture is real DOM → **plan step 1 surveys & saves it**.

### Manual verification (requires Chatwork login)

- [ ] Incoming auto-translates when toggle ON; shows button when OFF
- [ ] No infinite loop, no duplicate translation
- [ ] Outgoing Translate → preview → apply fills compose; **never auto-sends**
- [ ] Room switch keeps working
- [ ] Scrolling history causes no request storm
- [ ] Mentions/emoji preserved after translation

### TDD application

Pure-logic modules (engine parse, settings, **tokenizer**, dedupe, cache/rate-limit)
follow the TDD flow: tests first, user review, red run, then implementation.
Adapter/DOM and UX are manual-verify (no feasible automated test for live SPA DOM) —
the reason to skip automated TDD there is stated explicitly in the plan.

## Open Risks

1. **Observer loop / duplicate translation** — highest risk; dedicated tests + guards.
2. **Unofficial Google endpoint** — may rate-limit or change format; defensive parse
   + rate-limit + easy swap to another engine.
3. **Chatwork selector drift** — isolated in one adapter + health-check + fixtures.
4. **`setComposeText` on rich editor** — verified against live site before building the
   outgoing flow.
