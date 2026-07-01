# Debug log — settings / storage

### Falsy setting value must survive storage round-trip

2026-07-02

- **Symptom:** none yet (guarded proactively). `autoTranslateIncoming: false` could silently revert to its default `true`... no — default is `false`; the risk is any future falsy setting being dropped on read.
- **Root cause (latent):** `getSettings()` stores the whole settings object under a single string key `cwTranslateSettings` and reads it with `chrome.storage.local.get(KEY)` (string arg). The chrome mock's `??` default-merge branch only runs for the *object-of-defaults* call form. If someone "optimizes" `getSettings()` to `chrome.storage.local.get(DEFAULTS)`, the real Chrome API + mock both apply per-field defaults and a stored `false`/`0`/`''` gets overwritten by its default.
- **Fix:** current code is correct — keep passing a **string** key to `get()`, merge defaults in JS via `{ ...DEFAULTS, ...(stored || {}) }`. `src/shared/settings.js:9-12`.
- **Guard:** 3 tests in `test/settings.test.js` incl. partial-merge preserving other defaults. (Optional: add an explicit `false` round-trip test.)
- **Watch-for:** any change to `getSettings()` that calls `chrome.storage.local.get()` with an object/default-map argument instead of the string `KEY`. Also `test/setup.js` `??` branch is the canary.
