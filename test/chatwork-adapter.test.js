// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL as NodeURL } from 'node:url'
import { chatworkAdapter } from '../src/adapters/chatwork.js'

const fixture = readFileSync(
  fileURLToPath(new NodeURL('./fixtures/chatwork.html', import.meta.url)), 'utf8',
)

beforeEach(() => {
  document.body.innerHTML = fixture
  window.MYID = '11290229'
})

describe('chatworkAdapter', () => {
  it('matches chatwork hostname only', () => {
    expect(chatworkAdapter.matches('www.chatwork.com')).toBe(true)
    expect(chatworkAdapter.matches('sub.chatwork.com')).toBe(true)
    expect(chatworkAdapter.matches('example.com')).toBe(false)
    expect(chatworkAdapter.matches('notchatwork.com')).toBe(false)
  })

  it('finds the message container', () => {
    expect(chatworkAdapter.getMessageContainer()).not.toBeNull()
  })

  it('extracts messages with id, text element, rawText, isOwn', () => {
    const msgs = chatworkAdapter.extractMessages(document.body)
    expect(msgs.length).toBeGreaterThan(0)
    const m = msgs[0]
    expect(typeof m.id).toBe('string')
    expect(m.id).toMatch(/^\d+$/)
    expect(typeof m.rawText).toBe('string')
    expect(typeof m.isOwn).toBe('boolean')
    expect(m.textEl.tagName).toBe('PRE')
  })

  it('flags a message from window.MYID as own', () => {
    const msgs = chatworkAdapter.extractMessages(document.body)
    const own = msgs.find((m) => m.isOwn)
    expect(own).toBeTruthy()
  })

  it('skips rows that have no <pre> text (e.g. reply sub-blocks)', () => {
    const rows = document.querySelectorAll('[data-mid]')
    const extracted = chatworkAdapter.extractMessages(document.body)
    // every extracted message must have a real <pre>
    expect(extracted.every((m) => m.textEl && m.textEl.tagName === 'PRE')).toBe(true)
    // and we never extract more than the number of rows that actually contain a <pre>
    const rowsWithPre = [...rows].filter((r) => r.matches('._message') && r.querySelector('pre'))
    expect(extracted.length).toBe(rowsWithPre.length)
  })

  it('identifies our own injected translation artifacts', () => {
    const art = document.createElement('div')
    art.className = 'cw-translation'
    expect(chatworkAdapter.isTranslationArtifact(art)).toBe(true)
    expect(chatworkAdapter.isTranslationArtifact(document.body)).toBe(false)
  })

  it('mounts a translation block right after the text element', () => {
    const msgs = chatworkAdapter.extractMessages(document.body)
    const block = chatworkAdapter.mountIncomingTranslation(msgs[0].textEl, 'DICH')
    expect(block.classList.contains('cw-translation')).toBe(true)
    expect(msgs[0].textEl.nextElementSibling).toBe(block)
    expect(block.textContent).toBe('DICH')
    // mounting again updates in place, does not duplicate
    const block2 = chatworkAdapter.mountIncomingTranslation(msgs[0].textEl, 'DICH2')
    expect(block2).toBe(block)
    expect(block.textContent).toBe('DICH2')
  })

  it('reads and writes the compose textarea and dispatches input', () => {
    const el = chatworkAdapter.getComposeElement()
    expect(el.tagName).toBe('TEXTAREA')
    let inputFired = false
    el.addEventListener('input', () => { inputFired = true })
    chatworkAdapter.setComposeText('テスト')
    expect(chatworkAdapter.getComposeText()).toBe('テスト')
    expect(inputFired).toBe(true)
  })

  it('finds the compose toolbar anchor', () => {
    expect(chatworkAdapter.getComposeToolbar()).not.toBeNull()
  })
})
