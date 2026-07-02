// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderIncoming, mountOutgoingButton, showComposePreview } from '../src/content/ui.js'

beforeEach(() => { document.body.innerHTML = '' })

function fakeAdapter(toolbar) {
  return {
    getComposeToolbar: () => toolbar,
    mountIncomingTranslation: vi.fn((textEl, text) => {
      const b = document.createElement('div'); b.className = 'cw-translation'; b.textContent = text
      textEl.insertAdjacentElement('afterend', b); return b
    }),
  }
}

describe('ui', () => {
  it('renderIncoming delegates to adapter.mountIncomingTranslation', () => {
    const pre = document.createElement('pre'); document.body.appendChild(pre)
    const a = fakeAdapter(null)
    renderIncoming(a, pre, 'DICH')
    expect(a.mountIncomingTranslation).toHaveBeenCalledWith(pre, 'DICH')
  })

  it('mountOutgoingButton adds a Translate button to the toolbar once', () => {
    const toolbar = document.createElement('div'); document.body.appendChild(toolbar)
    const a = fakeAdapter(toolbar)
    let clicks = 0
    mountOutgoingButton(a, () => { clicks++ })
    mountOutgoingButton(a, () => { clicks++ }) // second call must NOT add a duplicate
    const btns = toolbar.querySelectorAll('.cw-translate-btn')
    expect(btns).toHaveLength(1)
    btns[0].click()
    expect(clicks).toBe(1)
  })

  it('mountOutgoingButton is a no-op when there is no toolbar', () => {
    const a = fakeAdapter(null)
    expect(() => mountOutgoingButton(a, () => {})).not.toThrow()
  })

  it('showComposePreview: Apply calls onApply with edited text and removes the box', () => {
    let applied = null
    showComposePreview('translated', { onApply: (t) => { applied = t } })
    const box = document.querySelector('.cw-translate-preview')
    expect(box).not.toBeNull()
    const ta = box.querySelector('textarea')
    ta.value = 'edited by user'
    box.querySelector('button').click() // first button is Apply
    expect(applied).toBe('edited by user')
    expect(document.querySelector('.cw-translate-preview')).toBeNull()
  })

  it('showComposePreview: Cancel calls onCancel and removes the box, does not apply', () => {
    let applied = false, cancelled = false
    showComposePreview('x', { onApply: () => { applied = true }, onCancel: () => { cancelled = true } })
    const buttons = document.querySelectorAll('.cw-translate-preview button')
    buttons[1].click() // second button is Cancel
    expect(cancelled).toBe(true)
    expect(applied).toBe(false)
    expect(document.querySelector('.cw-translate-preview')).toBeNull()
  })

  it('showComposePreview replaces an existing preview instead of stacking', () => {
    showComposePreview('one', { onApply(){} })
    showComposePreview('two', { onApply(){} })
    expect(document.querySelectorAll('.cw-translate-preview')).toHaveLength(1)
    expect(document.querySelector('.cw-translate-preview textarea').value).toBe('two')
  })
})
