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

  it('treats a null inner segment as empty, not "null"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [[['Hello ', 'x'], [null, 'y']], null, 'ja'],
    })
    const r = await translate('x', 'en')
    expect(r.text).toBe('Hello ')
  })

  it('ignores a non-string inner segment instead of coercing it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [[['Hello', 'x'], [1, 2, 3]], null, 'ja'],
    })
    const r = await translate('x', 'en')
    expect(r.text).toBe('Hello')
  })
})
