// src/translate/google.js
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single'

export async function translate(text, target) {
  const q = (text ?? '').trim()
  if (!q) return { text: '', detectedLang: null }

  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`translate failed: HTTP ${res.status}`)

  let body
  try { body = await res.json() } catch { throw new Error('translate parse error') }
  if (!Array.isArray(body) || !Array.isArray(body[0])) throw new Error('translate parse error: unexpected shape')

  const out = body[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('')
  const detectedLang = typeof body[2] === 'string' ? body[2] : null
  return { text: out, detectedLang }
}
