export function hashText(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return String(h)
}

export function dedupeKey(id, text) {
  return `${id}:${hashText(text)}`
}
