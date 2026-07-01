const OPEN = ''
const CLOSE = ''

// Order matters: match [qt]...[/qt] before bare bracket tags.
const PATTERNS = [
  /\[qt\][\s\S]*?\[\/qt\]/g,        // quote blocks
  /\[(?:To|rp|piconname|picon|dtext|info|title|code|hr):[^\]]*\]/gi, // CW tags w/ arg
  /\[\/?(?:info|title|code|hr)\]/gi, // CW block tags
  /https?:\/\/[^\s]+/g,             // URLs
]

export function protect(text) {
  const tokens = []
  let masked = text
  for (const re of PATTERNS) {
    masked = masked.replace(re, (m) => {
      const i = tokens.length
      tokens.push(m)
      return `${OPEN}${i}${CLOSE}`
    })
  }
  return { masked, tokens }
}

export function restore(masked, tokens) {
  // Tolerate stray whitespace the translator may inject inside the marker.
  return masked.replace(
    new RegExp(`${OPEN}\\s*(\\d+)\\s*${CLOSE}`, 'g'),
    (_, i) => tokens[Number(i)] ?? '',
  )
}
