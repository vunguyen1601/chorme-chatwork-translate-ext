# Part 1b — Foundation: tokenizer, dedupe (Task 3–4)

> Sibling of [index](2026-07-02-chatwork-translate.md). Execute after [Part 1a](2026-07-02-chatwork-translate-part1a-foundation.md).

---

### Task 3: `shared/tokenizer.js` — protect CW markup (TDD)

Chatwork message text contains `[To:123] Name`, `[picon:...]`, `[qt]...[/qt]`, emoji shortcodes, and URLs. Replace each with a stable placeholder `{n}` (private-use chars unlikely to be altered by translation) before translating, restore after. This is the most-tested pure unit.

**Files:**
- Create: `src/shared/tokenizer.js`
- Test: `test/tokenizer.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { protect, restore } from '../src/shared/tokenizer.js'

describe('tokenizer', () => {
  it('replaces a [To:] tag with a placeholder and restores it', () => {
    const { masked, tokens } = protect('[To:123] おはよう')
    expect(masked).not.toContain('[To:123]')
    expect(restore(masked, tokens)).toContain('[To:123]')
  })

  it('protects URLs', () => {
    const { masked, tokens } = protect('見て https://example.com/a?b=1 ね')
    expect(masked).not.toContain('http')
    expect(restore(masked, tokens)).toContain('https://example.com/a?b=1')
  })

  it('handles adjacent tokens without merging them', () => {
    const { masked, tokens } = protect('[To:1][To:2]hi')
    expect(tokens).toHaveLength(2)
    expect(restore(masked, tokens)).toBe('[To:1][To:2]hi')
  })

  it('is a no-op when there is nothing to protect', () => {
    const { masked, tokens } = protect('ただの文章')
    expect(tokens).toHaveLength(0)
    expect(restore(masked, tokens)).toBe('ただの文章')
  })

  it('restores even if translation adds spaces around placeholder', () => {
    const { masked, tokens } = protect('[qt]quote[/qt]text')
    // simulate translator inserting a space
    const translated = masked.replace('', ' ')
    expect(restore(translated, tokens)).toContain('[qt]quote[/qt]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tokenizer.test.js`
Expected: FAIL — `protect` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// src/shared/tokenizer.js
const OPEN = ''
const CLOSE = ''

// Order matters: match [qt]...[/qt] before bare bracket tags.
const PATTERNS = [
  /\[qt\][\s\S]*?\[\/qt\]/g,        // quote blocks
  /\[(?:To|rp|piconname|picon|dtext|info|title|code|hr):[^\]]*\]/gi, // CW tags w/ arg
  /\[\/?(?:info|title|code|hr)\]/gi, // CW block tags
  /https?:\/\/[^\s]+/g,             // URLs
]

export function protect(text) {
  const tokens = []
  let masked = text
  for (const re of PATTERNS) {
    masked = masked.replace(re, (m) => {
      const i = tokens.length
      tokens.push(m)
      return `${OPEN}${i}${CLOSE}`
    })
  }
  return { masked, tokens }
}

export function restore(masked, tokens) {
  // Tolerate stray whitespace the translator may inject inside the marker.
  return masked.replace(
    new RegExp(`${OPEN}\\s*(\\d+)\\s*${CLOSE}`, 'g'),
    (_, i) => tokens[Number(i)] ?? '',
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tokenizer.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/tokenizer.js test/tokenizer.test.js
git commit -m "feat: add chatwork markup tokenizer"
```

---

### Task 4: `shared/dedupe.js` — dedupe key + artifact check (TDD)

Prevents re-translating the same message and prevents translating our own injected nodes. Key = `${id}:${djb2(text)}`. Edited messages change the hash → re-translate.

**Files:**
- Create: `src/shared/dedupe.js`
- Test: `test/dedupe.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { dedupeKey, hashText } from '../src/shared/dedupe.js'

describe('dedupe', () => {
  it('same id + same text → same key', () => {
    expect(dedupeKey('m1', 'hello')).toBe(dedupeKey('m1', 'hello'))
  })
  it('same id + edited text → different key', () => {
    expect(dedupeKey('m1', 'hello')).not.toBe(dedupeKey('m1', 'hello!'))
  })
  it('different id → different key', () => {
    expect(dedupeKey('m1', 'x')).not.toBe(dedupeKey('m2', 'x'))
  })
  it('hashText is deterministic and numeric-string', () => {
    expect(hashText('abc')).toBe(hashText('abc'))
    expect(hashText('abc')).toMatch(/^\d+$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/dedupe.test.js`
Expected: FAIL — `dedupeKey` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// src/shared/dedupe.js
export function hashText(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return String(h)
}

export function dedupeKey(id, text) {
  return `${id}:${hashText(text)}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/dedupe.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/dedupe.js test/dedupe.test.js
git commit -m "feat: add message dedupe key helper"
```
