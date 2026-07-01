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
