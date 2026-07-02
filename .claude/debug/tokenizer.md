# Debug log — tokenizer (Chatwork markup protection)

### `[rp]` reply tags used colon syntax that Chatwork never emits

2026-07-02

- **Symptom:** real Chatwork reply markup passed straight to the translator and got mangled. `protect("[rp aid=123 to=456-789]...")` returned `tokens.length === 0` (unmatched).
- **Root cause:** original `PATTERNS` matched `[rp:...]` (colon form). Chatwork's actual syntax is space-attribute: `[rp aid=<id> to=<room>-<msg>]`. Colon form does not exist.
- **Fix:** added `/\[rp\s+[^\]]*\]/gi` to PATTERNS. `src/shared/tokenizer.js`.
- **Guard:** test "protects a Chatwork [rp] reply tag (space-attribute syntax)".
- **Watch-for:** exact `[rp]`/`[To:]`/emoji rendering must be re-confirmed against the REAL Chatwork DOM in Task 7 — these patterns are best-effort for documented syntax. If Task 7 shows a different shape, refine here.

### Round-trip corruption when input already contains PUA marker chars

2026-07-02

- **Symptom:** `protect` then `restore` corrupts text if the ORIGINAL input already contains U+E000 or U+E001 (the invisible private-use marker chars). Verified: `"x<E000>0<E001>y [To:9]z"` restored to `"x[To:9]y [To:9]z"`.
- **Root cause:** restore keys off the marker codepoints; a pre-existing marker in user text is indistinguishable from a real one.
- **Fix:** strip U+E000/U+E001 from input at the very start of `protect` before masking. `src/shared/tokenizer.js`.
- **Guard:** test "strips pre-existing marker chars from input so restore cannot collide".
- **Watch-for:** the emoji shortcode pattern `/\([a-z0-9*]{1,12}\)/gi` must NOT swallow ordinary parenthetical prose like `(see note)` — guarded by a dedicated test. Reviewer's earlier claim that a bare digit `0` in text corrupts restore was WRONG (verified: a digit not enclosed by the PUA markers does not match the restore regex).

### Markers can be DROPPED by Google on heavy sentence reordering (known v1 limitation)

2026-07-03

- **Symptom:** a protected token (mention/emoji/url) silently disappears from the translated
  output. `restore` then omits it — the translated line reads fine but is missing that token.
- **Root cause:** the U+E000/E001 placeholder does NOT always survive the Google round-trip.
  Verified empirically against the real endpoint: markers survive the large majority of cases
  (single/multiple markers + text, glued, at start/mid/end, URLs), but are LOST when a
  placeholder sits BETWEEN CJK tokens and the sentence is heavily reordered, e.g.
  `本当に<E000>0<E001>嬉しいです` → "Tôi thực sự rất hạnh phúc." (emoji gone).
  **Space-padding the placeholder does NOT fix it** (tested).
- **Impact:** GRACEFUL — the token is dropped, never corrupted, never crashes. Incoming is
  display-only (supplementary div below the untouched original), so cosmetic. Outgoing is
  gated by the preview before Apply.
- **Status:** accepted as a v1 known limitation (not fixed). If it proves common, the real
  fix is a translation-robust Latin sentinel (e.g. `zx<n>zx` that MT treats as a word),
  NOT whitespace padding.
- **Guard:** manual checklist includes an inline-emoji-mid-Japanese-sentence case
  (`docs/MANUAL-VERIFICATION.md`).
