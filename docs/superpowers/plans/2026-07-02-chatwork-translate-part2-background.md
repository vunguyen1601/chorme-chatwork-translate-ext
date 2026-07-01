# Part 2 — Background worker (Task 5–6)

> Sibling of [index](2026-07-02-chatwork-translate.md). Execute after Part 1.
> Task 5 is TDD (pure logic w/ fake timers). Task 6 is glue (TDD skipped — reason in index).

---

### Task 5: `background/cache.js` — TTL cache + rate-limited queue (TDD)

Two responsibilities in one small module:
- **`TtlCache`**: `get(key)` / `set(key, val)` with per-entry expiry.
- **`RateLimitedQueue`**: runs async jobs sequentially with a **fixed** minimum gap (`minGapMs`) between job starts. A rejecting job (e.g. `translate()` throwing on 429/timeout) is isolated — it does NOT poison the chain, and the next job still runs — but the gap is NOT auto-widened. There is no built-in backoff; any 429 retry/backoff must live in the caller (Task 6) if desired.

Uses injectable `now()` so tests use fake timers, no real waiting.

**Files:**
- Create: `src/background/cache.js`
- Test: `test/cache.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TtlCache, RateLimitedQueue } from '../src/background/cache.js'

describe('TtlCache', () => {
  it('returns undefined for missing key', () => {
    const c = new TtlCache({ ttlMs: 1000, now: () => 0 })
    expect(c.get('x')).toBeUndefined()
  })
  it('returns value before expiry, undefined after', () => {
    let t = 0
    const c = new TtlCache({ ttlMs: 1000, now: () => t })
    c.set('x', 'v')
    t = 999; expect(c.get('x')).toBe('v')
    t = 1001; expect(c.get('x')).toBeUndefined()
  })
})

describe('RateLimitedQueue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs jobs sequentially and returns their results', async () => {
    const q = new RateLimitedQueue({ minGapMs: 100 })
    const order = []
    const p1 = q.push(async () => { order.push('a'); return 1 })
    const p2 = q.push(async () => { order.push('b'); return 2 })
    await vi.runAllTimersAsync()
    expect(await p1).toBe(1)
    expect(await p2).toBe(2)
    expect(order).toEqual(['a', 'b'])
  })

  it('spaces job starts by at least minGapMs', async () => {
    const starts = []
    const q = new RateLimitedQueue({ minGapMs: 200, now: () => Date.now() })
    q.push(async () => { starts.push(Date.now()) })
    q.push(async () => { starts.push(Date.now()) })
    await vi.runAllTimersAsync()
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/cache.test.js`
Expected: FAIL — module/exports missing.

- [ ] **Step 3: Write minimal implementation**

```js
// src/background/cache.js
export class TtlCache {
  constructor({ ttlMs = 3600_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs
    this.now = now
    this.map = new Map()
  }
  get(key) {
    const e = this.map.get(key)
    if (!e) return undefined
    if (this.now() >= e.exp) { this.map.delete(key); return undefined }
    return e.val
  }
  set(key, val) {
    this.map.set(key, { val, exp: this.now() + this.ttlMs })
  }
}

export class RateLimitedQueue {
  constructor({ minGapMs = 200, now = () => Date.now() } = {}) {
    this.minGapMs = minGapMs
    this.now = now
    this.chain = Promise.resolve()
    this.lastStart = -Infinity
  }
  push(job) {
    const run = async () => {
      const wait = Math.max(0, this.lastStart + this.minGapMs - this.now())
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      this.lastStart = this.now()
      return job()
    }
    // Chain so jobs run one at a time; isolate caller errors from the chain.
    const result = this.chain.then(run)
    this.chain = result.catch(() => {})
    return result
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/cache.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/background/cache.js test/cache.test.js
git commit -m "feat: add ttl cache and rate-limited queue"
```

---

### Task 6: `background/service-worker.js` + `shared/messaging.js` — glue

**TDD skipped** — thin wiring over already-tested units; requires the live
`chrome.runtime` message channel which the unit harness does not provide. Behavior
is covered by Task 2 (google) + Task 5 (cache/queue) unit tests and by the manual
checklist in Part 3. State this reason, then proceed.

**Files:**
- Create: `src/shared/messaging.js`
- Create: `src/background/service-worker.js`
- Modify: `manifest.json` (register the background service worker)

- [ ] **Step 1: Create `src/shared/messaging.js`** (shared message contract)

```js
// src/shared/messaging.js
export const MSG = Object.freeze({
  TRANSLATE: 'TRANSLATE', // { type, text, target } → { translatedText, detectedLang } | { error }
})
```

- [ ] **Step 2: Create `src/background/service-worker.js`**

```js
// src/background/service-worker.js
import { MSG } from '../shared/messaging.js'
import { translate } from '../translate/google.js'
import { TtlCache, RateLimitedQueue } from './cache.js'
import { hashText } from '../shared/dedupe.js'

const cache = new TtlCache({ ttlMs: 3600_000 })
const queue = new RateLimitedQueue({ minGapMs: 200 })

async function handleTranslate({ text, target }) {
  const key = `${target}:${hashText(text)}`
  const cached = cache.get(key)
  if (cached !== undefined) return { translatedText: cached, detectedLang: null, cached: true }

  const { text: translatedText, detectedLang } = await queue.push(() => translate(text, target))
  cache.set(key, translatedText)
  return { translatedText, detectedLang }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== MSG.TRANSLATE) return false
  handleTranslate(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err?.message || err) }))
  return true // keep the message channel open for the async response
})
```

- [ ] **Step 3: Register the worker in `manifest.json`**

Add this top-level key to `manifest.json` (keep existing keys from Task 0):

```json
  "background": { "service_worker": "src/background/service-worker.js", "type": "module" }
```

- [ ] **Step 4: Sanity-check the full unit suite still passes**

Run: `npm test`
Expected: PASS — all Part 1 + Task 5 tests green (service-worker has no unit test by design).

- [ ] **Step 5: Commit**

```bash
git add src/shared/messaging.js src/background/service-worker.js manifest.json
git commit -m "feat: add background translate message handler"
```
