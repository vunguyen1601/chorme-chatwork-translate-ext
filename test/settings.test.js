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
