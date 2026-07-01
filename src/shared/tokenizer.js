const OPEN = ''
const CLOSE = ''

// Order matters: match [qt]...[/qt] before bare bracket tags, tags before emoji.
const PATTERNS = [
  /\[qt\][\s\S]*?\[\/qt\]/g,        // quote blocks
  /\[(?:To|rp|piconname|picon|dtext|info|title|code|hr):[^\]]*\]/gi, // CW tags w/ arg
  /\[rp\s+[^\]]*\]/gi,              // CW reply tag (space attributes, e.g. [rp aid=.. to=..])
  /\[\/?(?:info|title|code|hr)\]/gi, // CW block tags
  /https?:\/\/[^\s]+/g,             // URLs
  /\([a-z0-9*]{1,12}\)/gi,          // emoji shortcode, e.g. (smile) (y) (*) — after tags so tags win
]

export function protect(text) {
  const tokens = []
  // Strip any pre-existing marker chars so the placeholder namespace is
  // collision-free (they are invisible private-use chars, safe to remove).
  let masked = String(text).replaceAll(OPEN, '').replaceAll(CLOSE, '')
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
