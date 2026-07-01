// src/background/service-worker.js
import { MSG } from '../shared/messaging.js'
import { translate } from '../translate/google.js'
import { TtlCache, RateLimitedQueue } from './cache.js'
import { hashText } from '../shared/dedupe.js'

const cache = new TtlCache({ ttlMs: 3600_000 })
const queue = new RateLimitedQueue({ minGapMs: 200 })

async function handleTranslate({ text, target }) {
  const key = `${target}:${hashText(text)}`
  const cached = cache.get(key)
  if (cached !== undefined) return { translatedText: cached, detectedLang: null, cached: true }

  const { text: translatedText, detectedLang } = await queue.push(() => translate(text, target))
  cache.set(key, translatedText)
  return { translatedText, detectedLang }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== MSG.TRANSLATE) return false
  handleTranslate(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err?.message || err) }))
  return true // keep the message channel open for the async response
})
