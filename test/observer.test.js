// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MessageWatcher } from '../src/content/observer.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function fakeAdapter() {
  return {
    isTranslationArtifact: (n) => n.classList?.contains('cw-translation'),
    extractMessages: (root) =>
      [...root.querySelectorAll('.msg')].map((el, i) => ({
        id: el.dataset.id || String(i), textEl: el, rawText: el.textContent, isOwn: false,
      })),
  }
}

describe('MessageWatcher', () => {
  it('emits new messages once, debounced', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (msgs) => seen.push(...msgs.map((m) => m.id)),
      debounceMs: 100,
    })
    w.start()
    document.getElementById('c').innerHTML =
      '<div class="msg" data-id="a">hi</div><div class="msg" data-id="b">yo</div>'
    vi.advanceTimersByTime(150)
    expect(seen).toEqual(['a', 'b'])
  })

  it('does not re-emit an already-seen message', () => {
    document.body.innerHTML = '<div id="c"><div class="msg" data-id="a">hi</div></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.id)),
      debounceMs: 50,
    })
    w.start()
    w.scan() // manual re-scan
    vi.advanceTimersByTime(60)
    expect(seen.filter((x) => x === 'a')).toHaveLength(1)
  })

  it('ignores our own translation artifacts', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.id)),
      debounceMs: 50,
    })
    w.start()
    const art = document.createElement('div')
    art.className = 'cw-translation msg'; art.dataset.id = 'art'; art.textContent = 'x'
    document.getElementById('c').appendChild(art)
    vi.advanceTimersByTime(60)
    expect(seen).not.toContain('art')
  })

  it('re-emits an edited message (same id, changed text)', () => {
    document.body.innerHTML = '<div id="c"><div class="msg" data-id="a">hi</div></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.rawText)),
      debounceMs: 50,
    })
    w.start()
    vi.advanceTimersByTime(60)
    // edit the message text in place
    document.querySelector('.msg[data-id="a"]').textContent = 'edited'
    w.scan()
    vi.advanceTimersByTime(60)
    expect(seen).toEqual(['hi', 'edited'])
  })

  it('stop() disconnects and prevents further emits', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.id)),
      debounceMs: 50,
    })
    w.start()
    w.stop()
    document.getElementById('c').innerHTML = '<div class="msg" data-id="z">z</div>'
    vi.advanceTimersByTime(60)
    expect(seen).not.toContain('z')
  })
})
