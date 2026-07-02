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

### MV3 content scripts CANNOT be ES modules — `type:module` is ignored (ROOT CAUSE of "no Translate button")

2026-07-03

- **Symptom:** extension loaded, CSS injected (`.cw-translation` had the right border via
  computed style), all selectors matched (`#_timeLine/#_chatText/#_chatSendArea` present,
  `window.MYID` set), BUT the Translate button never appeared and no `.cw-*` node was created.
  No error in the PAGE console (content-script errors live in the isolated world).
- **Root cause:** `content_scripts[].type: "module"` is NOT a supported field — Chrome MV3
  content scripts are NOT ES modules. `type` there is silently ignored; Chrome loads the JS
  as a CLASSIC script. `index.js`'s first line is a top-level `import`, so it threw
  `Cannot use import statement outside a module` and died before `boot()`. CSS is injected
  independently of JS, which is why CSS worked while JS did nothing — the key diagnostic clue.
  (`type:module` IS valid on `background.service_worker`, just not on content_scripts.)
- **Fix:** content script `js` now points to a CLASSIC loader `src/content/loader.js` (no
  top-level import) that does `import(chrome.runtime.getURL('src/content/index.js'))` —
  dynamic import() IS allowed in a classic script and loads the real ES module chain via
  `web_accessible_resources`. Removed `type:module` from the content_scripts entry.
  `index.js` + its whole import chain stay ES modules, loaded on demand. manifest keeps
  `css` and the `src/content|adapters|shared/*.js` web_accessible_resources globs (which
  cover both loader.js and index.js).
- **Guard:** cannot be unit-tested (jsdom has no chrome.runtime / extension URL). Manual:
  after reloading the extension, the Translate button must appear near `#_chatSendArea` and
  `.cw-translate-btn` count must be 1.
- **Watch-for:** NEVER put a top-level `import`/`export` in a file listed directly in
  `content_scripts[].js`. Any new content entry must go through the dynamic-import loader.

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
