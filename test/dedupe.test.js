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
