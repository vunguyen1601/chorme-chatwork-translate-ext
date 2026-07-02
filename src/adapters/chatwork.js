// src/adapters/chatwork.js
//
// Chatwork site adapter — the ONLY file allowed to know Chatwork's real DOM
// selectors. See src/adapters/SELECTORS.md for the ground truth captured
// from the live DOM. If Chatwork's UI changes, only this file (and the
// SELECTORS table below) should need updating.
import { createAdapterBase } from './adapter.js'

const SELECTORS = {
  container: '#_timeLine',
  message: '[data-mid]._message',
  messageId: 'data-mid',
  deletedAttr: 'data-deleted',
  text: 'pre',
  authorAid: '[data-aid]',
  translationArtifact: 'cw-translation',
  compose: '#_chatText',
  composeToolbar: '#_chatSendArea',
  sendButton: 'button[data-testid="timeline_send-message-button"]',
}

function getMyId() {
  return typeof window !== 'undefined' ? window.MYID : undefined
}

function isTranslationArtifact(node) {
  return !!node?.classList?.contains(SELECTORS.translationArtifact)
}

function getMessageId(row) {
  return row?.getAttribute(SELECTORS.messageId) || ''
}

function extractMessages(root) {
  const scope = root || document
  const rows = scope.querySelectorAll(SELECTORS.message)
  const messages = []

  for (const row of rows) {
    if (isTranslationArtifact(row)) continue
    if (row.getAttribute(SELECTORS.deletedAttr) === '1') continue

    const textEl = row.querySelector(SELECTORS.text)
    if (!textEl) continue

    const authorEl = row.querySelector(SELECTORS.authorAid)
    const authorAid = authorEl ? authorEl.getAttribute('data-aid') : null
    const myId = getMyId()
    const isOwn = authorAid != null && myId != null && authorAid === myId

    messages.push({
      id: getMessageId(row),
      row,
      textEl,
      rawText: textEl.textContent || '',
      isOwn,
    })
  }

  return messages
}

function mountIncomingTranslation(textEl, text) {
  if (!textEl) return null

  const existing = textEl.nextElementSibling
  if (existing && isTranslationArtifact(existing)) {
    existing.textContent = text
    return existing
  }

  const block = document.createElement('div')
  block.className = SELECTORS.translationArtifact
  block.textContent = text
  textEl.insertAdjacentElement('afterend', block)
  return block
}

function getComposeElement() {
  return document.querySelector(SELECTORS.compose)
}

function getComposeText() {
  const el = getComposeElement()
  return el ? el.value : ''
}

function setComposeText(text) {
  const el = getComposeElement()
  if (!el) return false
  el.value = text
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

function getComposeToolbar() {
  return document.querySelector(SELECTORS.composeToolbar)
}

function getMessageContainer() {
  return document.querySelector(SELECTORS.container)
}

function matches(hostname) {
  return /(^|\.)chatwork\.com$/.test(hostname || '')
}

export const chatworkAdapter = Object.assign(createAdapterBase(), {
  matches,
  getMessageContainer,
  extractMessages,
  getMessageId,
  isTranslationArtifact,
  mountIncomingTranslation,
  getComposeElement,
  getComposeText,
  setComposeText,
  getComposeToolbar,
})
