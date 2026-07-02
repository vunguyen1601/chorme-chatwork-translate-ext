# Debug log — content observer (MutationObserver loop guard)

### The infinite-loop guard: how it actually works (design spec risk #1)

2026-07-03

- **The risk:** we inject a `.cw-translation` block into the observed message subtree →
  MutationObserver fires → `_schedule` → `scan` → if `scan` re-processes our own injection,
  it translates the translation → injects again → infinite loop.
- **What actually prevents it (verified empirically against the REAL adapter):**
  1. **id+text dedupe (the real guard).** `scan()` computes `dedupeKey(id, rawText)` per
     message and skips ids already in `seen`. When our block is injected, the original
     row's `<pre>` is unchanged → same id+text → already in `seen` → not re-emitted. This
     is the single load-bearing guard for Chatwork.
  2. **Adapter row-level filter.** `chatworkAdapter.extractMessages` skips rows where
     `isTranslationArtifact(row)` is true and only ever returns `textEl = row.querySelector('pre')`
     — so a `.cw-translation` div is never returned as a message in the first place.
- **The observer-level `isTranslationArtifact(m.textEl)` check is NOT a second guard for
  Chatwork** — with the real adapter `m.textEl` is always a `<pre>`, so it's always false.
  It is kept as a **contract-level defense** because the observer is adapter-agnostic (a
  different site adapter could hand back an artifact node as `textEl`). Commented as such in
  `src/content/observer.js`. Do NOT call it "belt-and-suspenders" for Chatwork — it's one
  real guard (dedupe) + one contract safety net.
- **Guard:** `test/observer.test.js` — "ignores our own translation artifacts",
  "does not re-emit an already-seen message", "re-emits an edited message" (edits DO get a
  new key and re-translate; identical re-renders do not).

### `start()` called twice leaked the first MutationObserver

2026-07-03

- **Symptom:** calling `start()` again (Task 10 does this on room switch) created a second
  MutationObserver while the first kept observing the container with no reference to
  disconnect it → leaked listener per room switch.
- **Root cause:** `start()` reassigned `this.observer` without disconnecting a prior one.
- **Fix:** `if (this.observer) this.stop()` at the top of `start()`. `src/content/observer.js`.
- **Guard:** test "start() called twice does not leak: only one observer active, no double emit".
- **Watch-for:** Task 10's room-switch re-attach must still call the watcher lifecycle
  correctly; the guard makes a bare double-`start()` safe but `stop()`+`start()` is cleaner.
  `seen` is intentionally NOT cleared on `stop()` (old visible messages shouldn't re-translate).
