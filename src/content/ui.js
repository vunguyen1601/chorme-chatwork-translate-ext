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
  btn.title = 'Dịch bản nháp trước khi gửi'
  btn.setAttribute('aria-label', 'Dịch bản nháp')
  // 文A glyph reads as "translate" across CJK/Latin; label kept for clarity.
  btn.innerHTML = '<span class="cw-translate-btn__icon" aria-hidden="true">文A</span>' +
    '<span class="cw-translate-btn__label">Dịch</span>'
  btn.addEventListener('click', onClick)
  toolbar.appendChild(btn)
}

// anchorEl (optional): the compose element; the preview docks just above it.
// Falls back to the fixed bottom-right corner when no anchor is given.
export function showComposePreview(translatedText, { onApply, onCancel, anchorEl } = {}) {
  document.querySelector('.cw-translate-preview')?.remove()

  const box = document.createElement('div')
  box.className = 'cw-translate-preview'
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-label', 'Xem trước bản dịch')

  const head = document.createElement('div')
  head.className = 'cw-translate-preview__head'
  const title = document.createElement('span')
  title.className = 'cw-translate-preview__title'
  title.textContent = 'Bản dịch'
  head.append(title)

  const ta = document.createElement('textarea')
  ta.className = 'cw-translate-preview__text'
  ta.value = translatedText
  ta.setAttribute('aria-label', 'Nội dung bản dịch, có thể chỉnh sửa')

  const actions = document.createElement('div')
  actions.className = 'cw-translate-preview__actions'

  // Order matters: tests treat the first <button> as Apply and the second as Cancel.
  const apply = document.createElement('button')
  apply.type = 'button'
  apply.className = 'cw-translate-preview__btn cw-translate-preview__btn--primary'
  apply.textContent = 'Áp dụng'
  apply.addEventListener('click', () => { onApply?.(ta.value); box.remove() })

  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'cw-translate-preview__btn'
  cancel.textContent = 'Huỷ'
  cancel.addEventListener('click', () => { onCancel?.(); box.remove() })

  actions.append(apply, cancel)
  box.append(head, ta, actions)

  dockPreview(box, anchorEl)
  document.body.appendChild(box)
  ta.focus()
  ta.setSelectionRange(ta.value.length, ta.value.length)
}

// Position the preview just above the compose box when we have an anchor,
// otherwise leave the CSS default (fixed bottom-right corner).
function dockPreview(box, anchorEl) {
  const rect = anchorEl?.getBoundingClientRect?.()
  if (!rect || (rect.width === 0 && rect.height === 0)) return
  box.classList.add('cw-translate-preview--docked')
  const gap = 10
  const width = Math.min(Math.max(rect.width, 280), 420)
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
  box.style.width = `${width}px`
  box.style.left = `${left}px`
  box.style.bottom = `${Math.max(8, window.innerHeight - rect.top + gap)}px`
}
