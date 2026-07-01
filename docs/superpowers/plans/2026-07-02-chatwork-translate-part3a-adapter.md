# Part 3a — DOM survey + adapter (Task 7–8)

> Sibling of [index](2026-07-02-chatwork-translate.md). Execute after Part 2.
> **Task 7 gates Task 8+** — adapter tests need the real DOM fixture. Continue with [Part 3b](2026-07-02-chatwork-translate-part3b-observer.md).

---

### Task 7: Survey live Chatwork DOM + save fixture (MANUAL — hard gate)

**TDD skipped** — this is a manual investigation, not code. It produces the inputs
(selectors + fixture) that Task 8 needs. Requires the user to be logged into Chatwork
(`https://www.chatwork.com/`); done on the user's machine via browser tools or manual
DevTools export.

**Files:**
- Create: `test/fixtures/chatwork.html`
- Create: `src/adapters/SELECTORS.md` (notes: which selector maps to what, with fallbacks)

- [ ] **Step 1: Open a Chatwork room while logged in and capture the message list DOM**

Record, for each item below, the primary selector + one fallback:
- message list container (observer root)
- a single message row, its stable message id attribute, its text element
- how to tell "own" vs "other" messages
- `[To:]` / emoji / quote markup as it appears in the raw text node
- the compose box element (note: contenteditable vs textarea) and its toolbar

- [ ] **Step 2: Save a real snapshot to `test/fixtures/chatwork.html`**

Export the outerHTML of the message-list container (with a few real messages, at least
one incoming + one own + one containing a `[To:]` mention) plus the compose area.
Strip any personal data / tokens before saving. This file is the source of truth for
adapter tests.

- [ ] **Step 3: Fill `src/adapters/SELECTORS.md`** with the mapping found in Step 1.

- [ ] **Step 4: Commit**

```bash
git add test/fixtures/chatwork.html src/adapters/SELECTORS.md
git commit -m "test: add chatwork dom fixture and selector notes"
```

> **STOP after Task 7 and confirm with the user** that the fixture reflects the real
> current Chatwork UI before writing selector code — this is the plan's biggest
> unknown.

---

### Task 8: `adapters/adapter.js` + `adapters/chatwork.js` (TDD, jsdom fixture)

Base contract throws for unimplemented methods; Chatwork adapter implements them
against selectors from Task 7. Tests load the fixture into jsdom.

> **Selector values below are illustrative placeholders derived from the spec.** During
> execution, replace each `SELECTORS.*` value and the fixture-dependent test
> expectations with the REAL values captured in Task 7. The contract and test
> *structure* are fixed; the concrete strings come from the fixture.

**Files:**
- Create: `src/adapters/adapter.js`
- Create: `src/adapters/chatwork.js`
- Test: `test/chatwork-adapter.test.js`
- Config: switch this test file to the jsdom environment (see Step 1 header)

- [ ] **Step 1: Write the failing test** (loads fixture into jsdom)

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chatworkAdapter } from '../src/adapters/chatwork.js'

const fixture = readFileSync(
  fileURLToPath(new URL('./fixtures/chatwork.html', import.meta.url)), 'utf8',
)

beforeEach(() => { document.body.innerHTML = fixture })

describe('chatworkAdapter', () => {
  it('matches chatwork hostname only', () => {
    expect(chatworkAdapter.matches('www.chatwork.com')).toBe(true)
    expect(chatworkAdapter.matches('example.com')).toBe(false)
  })

  it('finds the message container', () => {
    expect(chatworkAdapter.getMessageContainer()).not.toBeNull()
  })

  it('extracts messages with id, text, and isOwn flag', () => {
    const msgs = chatworkAdapter.extractMessages(document.body)
    expect(msgs.length).toBeGreaterThan(0)
    const m = msgs[0]
    expect(typeof m.id).toBe('string')
    expect(typeof m.rawText).toBe('string')
    expect(typeof m.isOwn).toBe('boolean')
    expect(m.textEl).toBeInstanceOf(Element)
  })

  it('ignores nodes it previously marked as translation artifacts', () => {
    const art = document.createElement('div')
    art.className = 'cw-translation'
    expect(chatworkAdapter.isTranslationArtifact(art)).toBe(true)
    expect(chatworkAdapter.isTranslationArtifact(document.body)).toBe(false)
  })

  it('reads and writes the compose box', () => {
    const el = chatworkAdapter.getComposeElement()
    expect(el).not.toBeNull()
    chatworkAdapter.setComposeText('テスト')
    expect(chatworkAdapter.getComposeText()).toContain('テスト')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/chatwork-adapter.test.js`
Expected: FAIL — `chatworkAdapter` not exported.

- [ ] **Step 3: Write `src/adapters/adapter.js`** (base contract)

```js
// src/adapters/adapter.js
const NI = (name) => () => { throw new Error(`adapter method not implemented: ${name}`) }

export function createAdapterBase() {
  return {
    matches: NI('matches'),
    getMessageContainer: NI('getMessageContainer'),
    extractMessages: NI('extractMessages'),
    getMessageId: NI('getMessageId'),
    isTranslationArtifact: NI('isTranslationArtifact'),
    mountIncomingTranslation: NI('mountIncomingTranslation'),
    getComposeElement: NI('getComposeElement'),
    getComposeText: NI('getComposeText'),
    setComposeText: NI('setComposeText'),
    getComposeToolbar: NI('getComposeToolbar'),
  }
}
```

- [ ] **Step 4: Write `src/adapters/chatwork.js`**

> Replace every `SELECTORS.*` string with the REAL selector from Task 7's
> `SELECTORS.md`. Values here are structural placeholders.

```js
// src/adapters/chatwork.js
import { createAdapterBase } from './adapter.js'

// ALL Chatwork selectors live here. Primary first; fall back on failure.
const SELECTORS = {
  container: '#_timeLine',                 // REPLACE from fixture
  message: '[data-mid]',                   // REPLACE
  messageId: 'data-mid',                   // REPLACE (attribute name)
  text: '.chatTimeLineMessage pre',        // REPLACE
  ownMarker: '[data-myself="true"]',       // REPLACE
  compose: '#_chatText',                   // REPLACE (may be textarea/contenteditable)
  composeToolbar: '#_chatSendTool',        // REPLACE
}
const ARTIFACT_CLASS = 'cw-translation'

function q(root, sel) { return root.querySelector(sel) }

export const chatworkAdapter = Object.assign(createAdapterBase(), {
  matches(hostname) { return /(^|\.)chatwork\.com$/.test(hostname) },

  getMessageContainer() { return q(document, SELECTORS.container) },

  getMessageId(node) {
    return node.getAttribute?.(SELECTORS.messageId) || ''
  },

  isTranslationArtifact(node) {
    return !!node.classList?.contains(ARTIFACT_CLASS)
  },

  extractMessages(root) {
    const out = []
    for (const node of root.querySelectorAll(SELECTORS.message)) {
      if (this.isTranslationArtifact(node)) continue
      const textEl = q(node, SELECTORS.text)
      if (!textEl) continue
      out.push({
        id: this.getMessageId(node) || String(out.length),
        textEl,
        rawText: textEl.textContent || '',
        isOwn: !!node.matches?.(SELECTORS.ownMarker),
      })
    }
    return out
  },

  mountIncomingTranslation(textEl, translatedText) {
    const existing = textEl.parentElement?.querySelector(`.${ARTIFACT_CLASS}`)
    if (existing) { existing.textContent = translatedText; return existing }
    const block = document.createElement('div')
    block.className = ARTIFACT_CLASS
    block.textContent = translatedText
    textEl.insertAdjacentElement('afterend', block)
    return block
  },

  getComposeElement() { return q(document, SELECTORS.compose) },
  getComposeToolbar() { return q(document, SELECTORS.composeToolbar) },

  getComposeText() {
    const el = this.getComposeElement()
    if (!el) return ''
    return 'value' in el ? el.value : (el.textContent || '')
  },

  setComposeText(text) {
    const el = this.getComposeElement()
    if (!el) return false
    if ('value' in el) { el.value = text }
    else { el.textContent = text }
    // Notify Chatwork's internal framework so Send button enables.
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/chatwork-adapter.test.js`
Expected: PASS (5 tests). If a selector-dependent test fails, fix the SELECTOR to match
the fixture — do not weaken the test.

- [ ] **Step 6: Commit**

```bash
git add src/adapters/adapter.js src/adapters/chatwork.js test/chatwork-adapter.test.js
git commit -m "feat: add chatwork site adapter"
```

