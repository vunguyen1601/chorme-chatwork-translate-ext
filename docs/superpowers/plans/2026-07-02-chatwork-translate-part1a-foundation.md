# Part 1a — Foundation: scaffold, settings, engine (Task 0–2)

> Sibling of [index](2026-07-02-chatwork-translate.md). Execute Task 0 → 2 in order.
> Pure-logic modules, no live Chatwork needed. Continue with [Part 1b](2026-07-02-chatwork-translate-part1b-foundation.md).

---

### Task 0: Project scaffold

**TDD skipped** — config/scaffold has no runtime behavior. State this, then proceed.

**Files:**
- Create: `package.json`, `vitest.config.js`, `.gitignore`, `test/setup.js`, `manifest.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "chatwork-translate",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Create `test/setup.js`** (global `chrome` mock)

```js
// Minimal chrome API mock shared by unit tests. Individual tests override as needed.
globalThis.chrome = {
  storage: {
    local: {
      _data: {},
      async get(keys) {
        if (keys == null) return { ...this._data }
        if (typeof keys === 'string') return { [keys]: this._data[keys] }
        const out = {}
        for (const k of Object.keys(keys)) out[k] = this._data[k] ?? keys[k]
        return out
      },
      async set(obj) { Object.assign(this._data, obj) },
      async clear() { this._data = {} },
    },
  },
  runtime: { sendMessage: async () => ({}), onMessage: { addListener() {} } },
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 5: Create placeholder `manifest.json`** (filled fully in Task 10)

```json
{
  "manifest_version": 3,
  "name": "Chatwork Translate",
  "version": "0.1.0",
  "description": "Two-way translation inside Chatwork.",
  "permissions": ["storage"],
  "host_permissions": ["*://*.chatwork.com/*"]
}
```

- [ ] **Step 6: Install and verify tooling**

Run: `npm install && npx vitest run --reporter=verbose`
Expected: install succeeds; Vitest runs and reports "No test files found" (exit 0 or "no tests" — acceptable at this stage).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js test/setup.js .gitignore manifest.json
git commit -m "chore: scaffold extension project with vitest"
```

---

### Task 1: `shared/settings.js` — settings wrapper (TDD)

Settings: `targetIncoming` (lang for translating incoming), `targetOutgoing` (lang for outgoing), `autoTranslateIncoming` (bool). Defaults: incoming `vi`, outgoing `ja`, auto `false`.

**Files:**
- Create: `src/shared/settings.js`
- Test: `test/settings.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { getSettings, saveSettings, DEFAULTS } from '../src/shared/settings.js'

beforeEach(async () => { await chrome.storage.local.clear() })

describe('settings', () => {
  it('returns defaults when storage empty', async () => {
    expect(await getSettings()).toEqual(DEFAULTS)
  })

  it('persists and merges partial updates over defaults', async () => {
    await saveSettings({ autoTranslateIncoming: true })
    const s = await getSettings()
    expect(s.autoTranslateIncoming).toBe(true)
    expect(s.targetIncoming).toBe(DEFAULTS.targetIncoming)
  })

  it('ignores unknown keys on save', async () => {
    await saveSettings({ bogus: 1, targetOutgoing: 'en' })
    const s = await getSettings()
    expect(s.targetOutgoing).toBe('en')
    expect('bogus' in s).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/settings.test.js`
Expected: FAIL — cannot import `getSettings` (module missing).

- [ ] **Step 3: Write minimal implementation**

```js
// src/shared/settings.js
export const DEFAULTS = Object.freeze({
  targetIncoming: 'vi',
  targetOutgoing: 'ja',
  autoTranslateIncoming: false,
})

const KEY = 'cwTranslateSettings'

export async function getSettings() {
  const { [KEY]: stored } = await chrome.storage.local.get(KEY)
  return { ...DEFAULTS, ...(stored || {}) }
}

export async function saveSettings(patch) {
  const allowed = Object.keys(DEFAULTS)
  const clean = {}
  for (const k of allowed) if (k in patch) clean[k] = patch[k]
  const next = { ...(await getSettings()), ...clean }
  await chrome.storage.local.set({ [KEY]: next })
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/settings.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/settings.js test/settings.test.js
git commit -m "feat: add settings storage wrapper"
```

---

### Task 2: `translate/google.js` — translation engine (TDD)

Calls the keyless endpoint `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=<target>&dt=t&q=<text>`. Response is a nested array; `data[0]` is an array of segments, each `segment[0]` is translated text; `data[2]` is the detected source lang.

**Files:**
- Create: `src/translate/google.js`
- Test: `test/google.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { translate } from '../src/translate/google.js'

afterEach(() => { vi.restoreAllMocks() })

const okBody = [[['Xin chào', 'こんにちは', null, null]], null, 'ja']

describe('google translate engine', () => {
  it('returns joined text and detected lang', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, json: async () => okBody,
    })
    const r = await translate('こんにちは', 'vi')
    expect(r).toEqual({ text: 'Xin chào', detectedLang: 'ja' })
  })

  it('joins multiple segments in order', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [[['Hello ', 'x'], ['world', 'y']], null, 'ja'],
    })
    const r = await translate('x', 'en')
    expect(r.text).toBe('Hello world')
  })

  it('skips empty input without calling fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const r = await translate('   ', 'vi')
    expect(r).toEqual({ text: '', detectedLang: null })
    expect(spy).not.toHaveBeenCalled()
  })

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 429 })
    await expect(translate('hi', 'vi')).rejects.toThrow(/429/)
  })

  it('throws on malformed body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) })
    await expect(translate('hi', 'vi')).rejects.toThrow(/parse/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/google.test.js`
Expected: FAIL — `translate` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// src/translate/google.js
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single'

export async function translate(text, target) {
  const q = (text ?? '').trim()
  if (!q) return { text: '', detectedLang: null }

  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`translate failed: HTTP ${res.status}`)

  let body
  try { body = await res.json() } catch { throw new Error('translate parse error') }
  if (!Array.isArray(body) || !Array.isArray(body[0])) throw new Error('translate parse error: unexpected shape')

  const out = body[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('')
  const detectedLang = typeof body[2] === 'string' ? body[2] : null
  return { text: out, detectedLang }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/google.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/translate/google.js test/google.test.js
git commit -m "feat: add google translate engine"
```

