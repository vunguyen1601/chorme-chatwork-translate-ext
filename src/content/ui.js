// src/content/ui.js — DOM affordances. No selectors here; all via adapter.
export function renderIncoming(adapter, textEl, translatedText) {
  adapter.mountIncomingTranslation(textEl, translatedText)
}

export function mountOutgoingButton(adapter, onClick) {
  const toolbar = adapter.getComposeToolbar()
  if (!toolbar || toolbar.querySelector('.cw-translate-btn')) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cw-translate-btn'
  btn.textContent = 'Translate'
  btn.addEventListener('click', onClick)
  toolbar.appendChild(btn)
}

export function showComposePreview(translatedText, { onApply, onCancel }) {
  document.querySelector('.cw-translate-preview')?.remove()
  const box = document.createElement('div')
  box.className = 'cw-translate-preview'
  const ta = document.createElement('textarea')
  ta.value = translatedText
  const apply = document.createElement('button')
  apply.textContent = 'Apply'
  apply.addEventListener('click', () => { onApply(ta.value); box.remove() })
  const cancel = document.createElement('button')
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => { onCancel?.(); box.remove() })
  box.append(ta, apply, cancel)
  document.body.appendChild(box)
}
