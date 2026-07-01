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

  it('protects a Chatwork [rp] reply tag (space-attribute syntax)', () => {
    const { masked, tokens } = protect('[rp aid=123 to=456-789] hello')
    expect(masked).not.toContain('[rp aid')
    expect(tokens.length).toBe(1)
    expect(restore(masked, tokens)).toContain('[rp aid=123 to=456-789]')
  })

  it('protects a Chatwork emoji shortcode', () => {
    const { masked, tokens } = protect('nice (smile) work')
    expect(tokens.length).toBe(1)
    expect(restore(masked, tokens)).toBe('nice (smile) work')
  })

  it('does not swallow ordinary parenthetical text', () => {
    const { masked, tokens } = protect('call me (see the note below)')
    expect(tokens.length).toBe(0)
    expect(restore(masked, tokens)).toBe('call me (see the note below)')
  })

  it('strips pre-existing marker chars from input so restore cannot collide', () => {
    const dirty = 'x0y [To:9]z'
    const { masked, tokens } = protect(dirty)
    const round = restore(masked, tokens)
    // the invisible PUA chars are removed; the real [To:9] survives
    expect(round).toBe('x0y [To:9]z')
    expect(round).not.toContain('')
    expect(round).not.toContain('')
  })
})
