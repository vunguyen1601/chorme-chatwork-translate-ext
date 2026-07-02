// src/content/observer.js
import { dedupeKey } from '../shared/dedupe.js'

export class MessageWatcher {
  constructor({ container, adapter, onMessages, debounceMs = 150 }) {
    this.container = container
    this.adapter = adapter
    this.onMessages = onMessages
    this.debounceMs = debounceMs
    this.seen = new Set()
    this.timer = null
    this.observer = null
  }

  start() {
    if (this.observer) this.stop() // guard: re-start (e.g. room switch) must not orphan the old observer
    this.observer = new MutationObserver(() => this._schedule())
    this.observer.observe(this.container, { childList: true, subtree: true })
    this._schedule()
  }

  stop() {
    this.observer?.disconnect()
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  _schedule() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.scan(), this.debounceMs)
  }

  scan() {
    const all = this.adapter.extractMessages(this.container)
    const fresh = []
    for (const m of all) {
      // Contract-level guard: an adapter may hand back an artifact node as textEl.
      // For the Chatwork adapter this is always false (textEl is a <pre>); the real
      // loop guard there is the id+text dedupe below.
      if (this.adapter.isTranslationArtifact(m.textEl)) continue
      const key = dedupeKey(m.id, m.rawText)
      if (this.seen.has(key)) continue
      this.seen.add(key)
      fresh.push(m)
    }
    if (fresh.length) this.onMessages(fresh)
  }
}
