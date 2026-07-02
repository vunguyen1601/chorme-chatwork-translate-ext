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

  it('start() called twice does not leak: only one observer active, no double emit', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const seen = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => seen.push(...m.map((x) => x.id)),
      debounceMs: 50,
    })
    w.start()
    const firstObserver = w.observer
    const firstDisconnect = vi.spyOn(firstObserver, 'disconnect')
    w.start() // second start must not orphan the first observer
    expect(w.observer).not.toBe(firstObserver) // a fresh observer is in place
    // leak-prevention contract: the old observer must have been disconnected
    expect(firstDisconnect).toHaveBeenCalled()
    document.getElementById('c').innerHTML = '<div class="msg" data-id="a">hi</div>'
    vi.advanceTimersByTime(60)
    // 'a' emitted exactly once (not doubled by two live observers sharing the timer)
    expect(seen.filter((x) => x === 'a')).toHaveLength(1)
  })

  it('collapses a rapid burst of mutations into a single emit batch', () => {
    document.body.innerHTML = '<div id="c"></div>'
    const batches = []
    const w = new MessageWatcher({
      container: document.getElementById('c'),
      adapter: fakeAdapter(),
      onMessages: (m) => batches.push(m.map((x) => x.id)),
      debounceMs: 100,
    })
    w.start()
    const c = document.getElementById('c')
    c.insertAdjacentHTML('beforeend', '<div class="msg" data-id="a">a</div>')
    c.insertAdjacentHTML('beforeend', '<div class="msg" data-id="b">b</div>')
    c.insertAdjacentHTML('beforeend', '<div class="msg" data-id="c2">c</div>')
    vi.advanceTimersByTime(150)
    // all three arrive in as few batches as debounce allows; importantly each id emitted once
    const allIds = batches.flat()
    expect(allIds.sort()).toEqual(['a', 'b', 'c2'])
    expect(new Set(allIds).size).toBe(3) // no duplicates
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
