# Part 3c — Content wire-up + popup (Task 10–11)

> Sibling of [index](2026-07-02-chatwork-translate.md). Execute after [Part 3b](2026-07-02-chatwork-translate-part3b-observer.md).

---

### Task 10: `content/ui.js` + `content/index.js` — wire-up (manual verify)

**TDD skipped** — live-DOM UI glue; no feasible automated harness for the Chatwork SPA.
Logic it depends on (adapter, observer, tokenizer, engine) is already unit-tested.

> **Background contract notes (from Task 6 review — verify in this task):** the bg
> `{type:TRANSLATE}` response is `{translatedText, detectedLang, error?, cached?}` where:
> (1) `error` is a bare STRING, no code — only `console.warn` it here; don't string-match
> for retry. (2) `detectedLang` is `null` on a cache hit — treat null as "unknown", never
> "no language". (3) `cached` is present only on hits (`undefined` on miss, not `false`) —
> don't assume it exists. `translateText` in this task reads only `error`+`translatedText`,
> so all three are currently safe; re-check if you consume `detectedLang`/`cached`.
> See `.claude/debug/background.md`.

**Files:**
- Create: `src/content/ui.js`
- Create: `src/content/index.js`
- Modify: `manifest.json` (register the content script + web-accessible module)

- [ ] **Step 1: Create `src/content/ui.js`**

```js
// src/content/ui.js — DOM affordances. No selectors here; all via adapter.
export function renderIncoming(adapter, textEl, translatedText) {
  adapter.mountIncomingTranslation(textEl, translatedText)
}

export function mountOutgoingButton(adapter, onClick) {
  const toolbar = adapter.getComposeToolbar()
  if (!toolbar || toolbar.querySelector('.cw-translate-btn')) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cw-translate-btn'
  btn.textContent = 'Translate'
  btn.addEventListener('click', onClick)
  toolbar.appendChild(btn)
}

export function showComposePreview(translatedText, { onApply, onCancel }) {
  document.querySelector('.cw-translate-preview')?.remove()
  const box = document.createElement('div')
  box.className = 'cw-translate-preview'
  const ta = document.createElement('textarea')
  ta.value = translatedText
  const apply = document.createElement('button')
  apply.textContent = 'Apply'
  apply.addEventListener('click', () => { onApply(ta.value); box.remove() })
  const cancel = document.createElement('button')
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => { onCancel?.(); box.remove() })
  box.append(ta, apply, cancel)
  document.body.appendChild(box)
}
```

- [ ] **Step 2: Create `src/content/index.js`**

```js
// src/content/index.js — entry point injected into chatwork.com
import { chatworkAdapter } from '../adapters/chatwork.js'
import { MessageWatcher } from './observer.js'
import { protect, restore } from '../shared/tokenizer.js'
import { getSettings } from '../shared/settings.js'
import { MSG } from '../shared/messaging.js'
import { renderIncoming, mountOutgoingButton, showComposePreview } from './ui.js'

const ADAPTERS = [chatworkAdapter]
const adapter = ADAPTERS.find((a) => a.matches(location.hostname))
if (!adapter) throw new Error('no adapter for host')

async function translateText(text, target) {
  const { masked, tokens } = protect(text)
  const res = await chrome.runtime.sendMessage({ type: MSG.TRANSLATE, text: masked, target })
  if (res?.error) throw new Error(res.error)
  return restore(res.translatedText, tokens)
}

async function handleIncoming(messages) {
  const s = await getSettings()
  if (!s.autoTranslateIncoming) return // OFF: per-message buttons handled separately (see note)
  for (const m of messages) {
    if (m.isOwn) continue
    try {
      const translated = await translateText(m.rawText, s.targetIncoming)
      if (translated) renderIncoming(adapter, m.textEl, translated)
    } catch (e) { console.warn('[cw-translate] incoming failed', e) }
  }
}

function bootCompose() {
  mountOutgoingButton(adapter, async () => {
    const s = await getSettings()
    const raw = adapter.getComposeText()
    if (!raw.trim()) return
    try {
      const translated = await translateText(raw, s.targetOutgoing)
      showComposePreview(translated, {
        onApply: (finalText) => adapter.setComposeText(finalText),
      })
    } catch (e) { console.warn('[cw-translate] outgoing failed', e) }
  })
}

function boot() {
  const container = adapter.getMessageContainer()
  if (!container) {
    console.warn('[cw-translate] container not found — Chatwork UI may have changed')
    return
  }
  new MessageWatcher({ container, adapter, onMessages: handleIncoming }).start()
  bootCompose()
}

boot()
```

> **Note on toggle-OFF per-message buttons:** with auto OFF, `handleIncoming` returns
> early. Injecting a per-message "Translate" button is a follow-up refinement using
> the same `translateText` + `renderIncoming`; keep v1 focused on the auto path and
> the outgoing button, and add the per-message button once the auto path is verified.

- [ ] **Step 3: Register content script in `manifest.json`**

Add these top-level keys (keep existing keys):

```json
  "content_scripts": [
    {
      "matches": ["*://*.chatwork.com/*"],
      "js": ["src/content/index.js"],
      "type": "module",
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    { "resources": ["src/**"], "matches": ["*://*.chatwork.com/*"] }
  ]
```

- [ ] **Step 4: Load unpacked & smoke-test**

Load the folder via `chrome://extensions` (Developer mode → Load unpacked). Open a
Chatwork room. Expected: no console errors from `[cw-translate]`; container found.

- [ ] **Step 5: Commit**

```bash
git add src/content/ui.js src/content/index.js manifest.json
git commit -m "feat: wire content script, incoming auto-translate and outgoing button"
```

---

### Task 11: `popup/` settings UI + manual verification checklist

**TDD skipped** — static settings UI; behavior covered by `settings.js` unit tests.

**Files:**
- Create: `src/popup/popup.html`, `src/popup/popup.js`
- Modify: `manifest.json` (`action.default_popup`)

- [ ] **Step 1: Create `src/popup/popup.html`**

```html
<!doctype html>
<html><head><meta charset="utf-8"><style>
  body{font:13px system-ui;padding:12px;width:220px}
  label{display:block;margin:8px 0}
</style></head><body>
  <label><input type="checkbox" id="auto"> Auto-translate incoming</label>
  <label>Incoming target <input id="in" size="4"></label>
  <label>Outgoing target <input id="out" size="4"></label>
  <script type="module" src="popup.js"></script>
</body></html>
```

- [ ] **Step 2: Create `src/popup/popup.js`**

```js
import { getSettings, saveSettings } from '../shared/settings.js'

const auto = document.getElementById('auto')
const inp = document.getElementById('in')
const out = document.getElementById('out')

const s = await getSettings()
auto.checked = s.autoTranslateIncoming
inp.value = s.targetIncoming
out.value = s.targetOutgoing

auto.addEventListener('change', () => saveSettings({ autoTranslateIncoming: auto.checked }))
inp.addEventListener('change', () => saveSettings({ targetIncoming: inp.value.trim() }))
out.addEventListener('change', () => saveSettings({ targetOutgoing: out.value.trim() }))
```

- [ ] **Step 3: Register popup in `manifest.json`**

Add top-level key:

```json
  "action": { "default_popup": "src/popup/popup.html" }
```

- [ ] **Step 4: Run the FULL manual verification checklist** (logged into Chatwork)

- [ ] Toggle ON in popup → new incoming messages auto-translate below the original
- [ ] No infinite loop; each message translated exactly once (check console counts)
- [ ] Toggle OFF → no auto-translation of new messages
- [ ] Outgoing: type text → Translate button → preview appears → Apply fills compose box
- [ ] Extension NEVER clicks Send (verify the message is not sent by the extension)
- [ ] Mentions `[To:]` / emoji preserved intact in both incoming and outgoing output
- [ ] Switch to another room → observer still translates new messages
- [ ] Scroll up to load old messages → no request storm (old messages not auto-translated)
- [ ] Rate-limit case: rapid messages don't error out the chat UI

- [ ] **Step 5: Commit**

```bash
git add src/popup/popup.html src/popup/popup.js manifest.json
git commit -m "feat: add settings popup"
```

---

## Done criteria

- All Vitest suites green (`npm test`).
- Manual checklist in Task 11 Step 4 fully passes on live Chatwork.
- No file exceeds 500 lines; each `.md` ≤ 300 lines.
