# Debug log — content script wiring (Task 10)

### Unhandled rejection from getSettings() outside try/catch

2026-07-03

- **Symptom:** unhandled promise rejection on the Chatwork page console, typically
  "Extension context invalidated", after the extension is reloaded/updated while an old
  content script + its MutationObserver are still alive and firing.
- **Root cause:** `handleIncoming` is passed as the observer's `onMessages` and the observer
  calls it WITHOUT awaiting. Its first line `await getSettings()` (→ `chrome.storage.local.get`)
  was outside any try/catch, so a rejection escaped as an unhandled rejection.
- **Fix:** wrap the whole `handleIncoming` body in try/catch (keep the inner per-message
  try/catch for granularity). `src/content/index.js`.
- **Guard:** no automated test (index.js is TDD-skipped live glue); manual: reload the
  extension with a Chatwork tab open and confirm no unhandled rejection appears.
- **Watch-for:** any other `chrome.*` call reachable from an un-awaited observer/DOM callback
  must be inside a try/catch — `chrome.runtime.sendMessage` in `translateText` is already
  covered by the per-message catch.

### MV3 ES-module content script — manual-verify only

2026-07-03

- `manifest.json` uses `content_scripts[].type: "module"` (Chrome M91+) so `index.js` can
  `import` sibling files, and `web_accessible_resources: ["src/**"]` so those imported
  modules resolve under `chrome-extension://<id>/src/...`. Syntax is correct but CANNOT be
  verified by jsdom unit tests — the manual smoke test MUST confirm the whole import chain
  (`index.js` → adapter/observer/tokenizer/settings/messaging/ui) loads in real Chrome with
  no `[cw-translate]` console errors.

### Intentional never-clearing poll in boot()

2026-07-03

- `boot()`'s `setInterval(…, 1000)` is deliberately never cleared on the success path: it
  both waits for the initial `#_timeLine` and detects room switches (Chatwork replaces the
  `#_timeLine` node → `container !== watchedContainer` → re-attach). The give-up counter
  (`tries > 20`) only applies before the first successful attach. This is by design, not a
  leaked timer. `src/content/index.js`.
- **UX note (not fixed, v1):** `handleIncoming` translates a burst sequentially (`for..await`).
  The background rate-limiter (200ms gap) already serializes requests, so parallelizing
  wouldn't speed it up and would scramble display order. Sequential is the right v1 choice.
