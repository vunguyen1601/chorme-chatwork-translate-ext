// src/content/index.js — entry point injected into chatwork.com
import { chatworkAdapter } from '../adapters/chatwork.js'
import { MessageWatcher } from './observer.js'
import { protect, restore } from '../shared/tokenizer.js'
import { getSettings } from '../shared/settings.js'
import { MSG } from '../shared/messaging.js'
import { renderIncoming, mountOutgoingButton, showComposePreview } from './ui.js'

const ADAPTERS = [chatworkAdapter]
const adapter = ADAPTERS.find((a) => a.matches(location.hostname))
if (!adapter) throw new Error('no adapter for host')

async function translateText(text, target) {
  const { masked, tokens } = protect(text)
  const res = await chrome.runtime.sendMessage({ type: MSG.TRANSLATE, text: masked, target })
  if (res?.error) throw new Error(res.error)
  return restore(res.translatedText, tokens)
}

async function handleIncoming(messages) {
  try {
    const s = await getSettings()
    if (!s.autoTranslateIncoming) return
    for (const m of messages) {
      if (m.isOwn) continue
      try {
        const translated = await translateText(m.rawText, s.targetIncoming)
        if (translated) renderIncoming(adapter, m.textEl, translated)
      } catch (e) { console.warn('[cw-translate] incoming failed', e) }
    }
  } catch (e) {
    // e.g. "Extension context invalidated" after an extension reload — swallow so the
    // observer's un-awaited onMessages() call can never surface an unhandled rejection.
    console.warn('[cw-translate] handleIncoming aborted', e)
  }
}

function bootCompose() {
  mountOutgoingButton(adapter, async () => {
    const s = await getSettings()
    const raw = adapter.getComposeText()
    if (!raw.trim()) return
    try {
      const translated = await translateText(raw, s.targetOutgoing)
      showComposePreview(translated, {
        onApply: (finalText) => adapter.setComposeText(finalText),
      })
    } catch (e) { console.warn('[cw-translate] outgoing failed', e) }
  })
}

let watcher = null
let watchedContainer = null

function attachTo(container) {
  if (watcher) watcher.stop()
  watchedContainer = container
  watcher = new MessageWatcher({ container, adapter, onMessages: handleIncoming })
  watcher.start()
  bootCompose()
}

function boot() {
  let tries = 0
  // Poll forever: this both waits for the initial container AND detects room switches
  // (Chatwork replaces the #_timeLine node), so we intentionally never clearInterval on
  // the success path. The give-up counter only applies before the first successful attach.
  const poll = setInterval(() => {
    const container = adapter.getMessageContainer()
    if (container && container !== watchedContainer) {
      attachTo(container)
    } else if (!container && !watchedContainer && ++tries > 20) {
      clearInterval(poll)
      console.warn('[cw-translate] container not found — Chatwork UI may have changed')
    }
    // keep polling to catch room switches (container node changes)
  }, 1000)
}

boot()
