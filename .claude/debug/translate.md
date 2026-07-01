# Debug log — translate engine

### Silent corrupted translation from inner-segment format drift

2026-07-02

- **Symptom:** `translate()` returns a plausible-but-wrong string (e.g. `'Hello null'` or `'Hello1'`) with no error, when the Google response's `body[0]` contains a segment whose `seg[0]` is `null` or a non-string primitive.
- **Root cause:** `body[0].map(seg => Array.isArray(seg) ? seg[0] : '').join('')` only guarded the *outer* shape. Once `seg` is an array, `seg[0]` was trusted; `null`/number heads flow into `.join('')` (→ `"null"` / coerced number). The unofficial `translate_a/single` endpoint interleaves such metadata segments. Matches spec risk #2 (unofficial endpoint format drift).
- **Fix:** narrow extraction to string heads only — `Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''`. `src/translate/google.js` (segment map line).
- **Guard:** 2 tests in `test/google.test.js` — null inner segment → empty; non-string inner segment → ignored (not coerced).
- **Watch-for:** any future parse of nested Google arrays that trusts a value's type after only an `Array.isArray` check. Same defensive-parse discipline applies if a new `dt` param adds more nested fields.
