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
    const translated = masked.replace('', ' ')
    expect(restore(translated, tokens)).toContain('[qt]quote[/qt]')
  })
})
