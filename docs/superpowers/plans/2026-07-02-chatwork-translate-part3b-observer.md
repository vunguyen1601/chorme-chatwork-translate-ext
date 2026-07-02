# Part 3b — Message observer (Task 9)

> Sibling of [index](2026-07-02-chatwork-translate.md). Execute after [Part 3a](2026-07-02-chatwork-translate-part3a-adapter.md).

---

### Task 9: `content/observer.js` — MutationObserver + loop guard (TDD, jsdom)

Watches the container, debounces bursts, hands new (non-artifact, non-duplicate)
messages to a callback. Injectable adapter + `setTimeout` so it is testable.

> **Notes carried from Task 8 review (address here or in Task 10):**
> 1. **Container health-check:** `getMessageContainer()` can return `null` if Chatwork
>    changed its DOM or the timeline hasn't rendered yet. The observer MUST handle a null
>    container gracefully (retry/poll until present, or bail with a console warning — see
>    design spec's "health-check"), not throw. Chatwork is an SPA: the container may appear
>    after initial load and be replaced on room switch, so re-attach logic is needed.
> 2. **`mountIncomingTranslation` fragility to re-render:** the adapter's idempotency check
>    only inspects `textEl.nextElementSibling`. If Chatwork re-renders a row after we mount
>    (React/styled-components), our block can be orphaned and a re-process would duplicate it.
>    The observer's dedupe (by message id + text hash) is the primary guard against
>    re-translating; ensure a re-rendered row that reappears is treated as already-seen
>    (same id+text → skipped) so we don't double-mount. Verify in Task 10 manual testing.

**Files:**
- Create: `src/content/observer.js`
- Test: `test/observer.test.js`

- [ ] **Step 1: Write the failing test**

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MessageWatcher } from '../src/content/observer.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function fakeAdapter() {
  return {
    isTranslationArtifact: (n) => n.classList?.contains('cw-translation'),
    extractMessages: (root) =>
      [...root.querySelectorAll('.msg')].map((el, i) => ({
        id: el.dataset.id || String(i), textEl: el, rawText: el.textContent, isOwn: false,
      })),
  }
}

describe('MessageWatcher', () => {
  it('emits new messages once, debounced', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (msgs) => seen.push(...msgs.map((m) => m.id)),
      debounceMs: 100,
    })
    w.start()
    document.getElementById('c').innerHTML =
      '<div class="msg" data-id="a">hi</div><div class="msg" data-id="b">yo</div>'
    vi.advanceTimersByTime(150)
    expect(seen).toEqual(['a', 'b'])
  })

  it('does not re-emit an already-seen message', () => {
    document.body.innerHTML = '<div id="c"><div class="msg" data-id="a">hi</div></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.id)),
      debounceMs: 50,
    })
    w.start()
    w.scan() // manual re-scan
    vi.advanceTimersByTime(60)
    expect(seen.filter((x) => x === 'a')).toHaveLength(1)
  })

  it('ignores our own translation artifacts', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.id)),
      debounceMs: 50,
    })
    w.start()
    const art = document.createElement('div')
    art.className = 'cw-translation msg'; art.dataset.id = 'art'; art.textContent = 'x'
    document.getElementById('c').appendChild(art)
    vi.advanceTimersByTime(60)
    expect(seen).not.toContain('art')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/observer.test.js`
Expected: FAIL — `MessageWatcher` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// src/content/observer.js
import { dedupeKey } from '../shared/dedupe.js'

export class MessageWatcher {
  constructor({ container, adapter, onMessages, debounceMs = 150 }) {
    this.container = container
    this.adapter = adapter
    this.onMessages = onMessages
    this.debounceMs = debounceMs
    this.seen = new Set()
    this.timer = null
    this.observer = null
  }

  start() {
    this.observer = new MutationObserver(() => this._schedule())
    this.observer.observe(this.container, { childList: true, subtree: true })
    this._schedule()
  }

  stop() {
    this.observer?.disconnect()
    if (this.timer) clearTimeout(this.timer)
  }

  _schedule() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.scan(), this.debounceMs)
  }

  scan() {
    const all = this.adapter.extractMessages(this.container)
    const fresh = []
    for (const m of all) {
      if (this.adapter.isTranslationArtifact(m.textEl)) continue
      const key = dedupeKey(m.id, m.rawText)
      if (this.seen.has(key)) continue
      this.seen.add(key)
      fresh.push(m)
    }
    if (fresh.length) this.onMessages(fresh)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/observer.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/observer.js test/observer.test.js
git commit -m "feat: add debounced message watcher with loop guard"
```

