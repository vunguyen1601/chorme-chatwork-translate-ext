# Chatwork Translate

A Chrome (MV3) extension that adds **two-way translation** inside [Chatwork](https://www.chatwork.com/):

- **Incoming** — auto-translates messages from other people and shows the translation
  inline, right below the original.
- **Outgoing** — a **Translate** button next to the compose box translates your draft and
  shows a preview; **Apply** fills the compose box. The extension **never sends for you** —
  you always click Chatwork's own Send button.

Source language is auto-detected; target languages are configurable (defaults: incoming →
Vietnamese, outgoing → Japanese). Translation uses the keyless Google Translate web
endpoint, isolated behind one module so other engines can be added later.

## Install (load unpacked)

1. Clone this repo.
2. Open `chrome://extensions`, enable **Developer mode** (top right).
3. Click **Load unpacked** and select the repository folder.
4. Open a Chatwork room. A **Translate** button appears near the message box.

No build step is required — it ships as plain ES modules.

## Usage

- **Toggle auto-translate incoming:** click the extension icon to open the popup; check
  *Auto-translate incoming*. When on, new incoming messages are translated automatically.
- **Set target languages:** in the popup, set *Incoming target* and *Outgoing target*
  (ISO codes, e.g. `vi`, `ja`, `en`). Blank values are ignored.
- **Translate a draft:** type in the compose box, click **Translate**, review the preview,
  then **Apply** to replace your draft. Send it yourself.

## Architecture

Four isolated layers; the content script touches the DOM, and every translation call is
routed through the background service worker.

| Area | File(s) | Responsibility |
|---|---|---|
| Background | `src/background/service-worker.js`, `cache.js` | Translate proxy: TTL cache + rate-limited queue |
| Engine | `src/translate/google.js` | The only module that knows Google; `translate(text, target)` |
| Content | `src/content/` | Injected into Chatwork: observer, UI, entry wiring |
| Adapter | `src/adapters/chatwork.js` | The only file with Chatwork DOM selectors |
| Shared | `src/shared/` | settings, tokenizer, dedupe, message contract |

Key design points:

- **Loop guard.** New translations are injected into the observed DOM; a `MutationObserver`
  in `content/observer.js` dedupes by message id + text hash and skips our own injected
  nodes, so a translation is never re-translated.
- **Markup protection.** `shared/tokenizer.js` masks Chatwork markup (`[To:]`, `[rp ...]`,
  emoji shortcodes, URLs) with placeholders before translating and restores them after.
- **Selector isolation.** All selectors live in `adapters/chatwork.js` — if Chatwork
  changes its UI, only that file needs updating. See `src/adapters/SELECTORS.md`.
- **MV3 module loading.** Chrome content scripts are not ES modules, so a classic loader
  (`content/loader.js`) dynamic-imports the real module chain via `web_accessible_resources`.

## Development

```bash
npm install
npm test        # run the unit tests (Vitest + jsdom)
```

53 unit tests cover the engine, cache/rate-limit, tokenizer, dedupe, settings, the site
adapter, the observer, and the UI. The content-script wiring and popup are verified
manually (no automated harness for the live Chatwork SPA) — see
[`docs/MANUAL-VERIFICATION.md`](docs/MANUAL-VERIFICATION.md).

## Documentation

- Design spec: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Implementation plan: [`docs/superpowers/plans/`](docs/superpowers/plans/)
- Manual test checklist: [`docs/MANUAL-VERIFICATION.md`](docs/MANUAL-VERIFICATION.md)

## Permissions

- `storage` — save your settings.
- `*://*.chatwork.com/*` — run only on Chatwork.

Only message text is sent to Google Translate (that is the feature). Nothing else is
collected; the extension does not touch Chatwork cookies, tokens, or your login.

## Known limitations (v1)

- The keyless Google endpoint is unofficial and may rate-limit or change format.
- Rendered Chatwork emoji are images, so they don't appear in the translated text line.
- On heavy sentence reordering, a protected token can be dropped by the translator
  (graceful — the token is omitted, never corrupted).
- No per-message Translate button when auto is off (auto path is the v1 focus).
- No bundled toolbar icon (Chrome shows a default).
