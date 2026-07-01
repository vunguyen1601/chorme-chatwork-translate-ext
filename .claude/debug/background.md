# Debug log — background service worker

### Integration contracts to honor in Task 10 (content wiring)

2026-07-02

Not bugs — design notes surfaced by code review of Task 6 (`54ad25e`). The background
`handleTranslate` response shape has three quirks the content script must respect:

1. **Error is a bare string.** `{error: String(err?.message||err)}` collapses all failure
   modes to text: `"translate failed: HTTP 429"`, `"translate parse error"`,
   `"translate parse error: unexpected shape"`. There is NO `code`/`status` field.
   - Task 10 currently only `console.warn`s the error → fine.
   - **Watch-for:** if any retry/backoff UI is added (429 → "retrying…" vs hard parse
     error), do NOT string-match the message. Thread a `code` field through
     `google.js` throw → `handleTranslate` → response instead. `src/translate/google.js:10-14`.

2. **`detectedLang` is `null` on a cache hit** (`service-worker.js:13`), a real value on a
   cache miss. Task 10 must treat `null` as "unknown/possibly cached", NOT "no language".
   - **Watch-for:** a future "skip translating same-language messages" feature must not
     trust `detectedLang` from a cached response.

3. **`cached` key is present only on the hit path** (`cached: true`), absent on miss (so
   `res.cached` is `undefined`, not `false`). Do not assume the field exists.
   - If Task 10 starts consuming it, normalize to always include `cached: true|false`.

### MV3 module-level cache/queue reset on worker restart — benign

2026-07-02

- **Symptom (non-issue):** `cache`/`queue` are module-level in `service-worker.js:7-8`; an
  MV3 worker is evicted after ~30s idle and respawns with empty state.
- **Why benign:** cache loss → just a cache miss (live refetch, no stale data). Queue loss →
  `lastStart` resets to `-Infinity`, first post-restart job runs immediately; nothing
  persists a rate-limit budget, so worst case is one request slightly early. No correctness
  dependency on this state surviving.
- **Watch-for:** do NOT "fix" this by adding `chrome.storage`-backed persistence without a
  real need — it was a conscious trade-off.
