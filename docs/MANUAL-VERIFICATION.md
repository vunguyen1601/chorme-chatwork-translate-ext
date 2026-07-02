# Manual Verification Checklist — Chatwork Translate

The content script and popup run against the live Chatwork SPA; there is no automated
harness for them. Run this checklist once after loading the extension. It gathers the
plan's Task 10/11 checks plus notes surfaced during code review.

## Load the extension

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `/Users/vunt/work/projects/repo/mcp/chrome_ext`.
3. Open a Chatwork room (e.g. the one used to build the fixture).
4. Open DevTools console on the Chatwork tab; filter for `[cw-translate]`.

## MV3 module load (gates everything)

- [ ] No `[cw-translate]` errors in the console on load.
- [ ] No module-resolution errors (the ES-module content script must load its imports
      `adapter / observer / tokenizer / settings / messaging / ui` via
      `chrome-extension://<id>/src/...`). A failure here means `web_accessible_resources`
      or `type:module` is wrong — check `manifest.json`.

## Popup settings

- [ ] Toolbar icon (or puzzle-piece menu → Chatwork Translate) opens the popup.
- [ ] Popup shows the current values (auto off, incoming `vi`, outgoing `ja` by default).
- [ ] Toggle **Auto-translate incoming**, change targets; reopen the popup — values persisted.
- [ ] **Race check:** change one field, Tab to another, change it, Tab out — reopen popup,
      BOTH values persisted (guards the atomic-save fix).
- [ ] **Blank target check:** clear the Incoming target, blur, reopen popup — it did NOT
      persist an empty value (kept the prior value; guards the blank-target fix).

## Incoming translation (toggle ON)

- [ ] With auto ON, a NEW incoming message (from someone else) shows a translated block
      below the original `<pre>`.
- [ ] Each message is translated exactly once — no duplicate blocks, no infinite loop
      (watch the console; the id+text dedupe should prevent re-processing our own block).
- [ ] Your OWN messages are NOT translated (isOwn via `window.MYID`).
- [ ] With auto OFF, new messages are NOT auto-translated.

## Outgoing translation (never sends)

- [ ] A **Translate** button appears near the compose box (`#_chatSendArea`).
- [ ] Type text, click Translate → a preview box appears with the translated text.
- [ ] **Apply** fills the compose textarea with the translated text.
- [ ] **Cancel** discards, leaves the compose box unchanged.
- [ ] The extension NEVER sends — you always click Chatwork's own 送信/Send yourself.

## Robustness / edge cases

- [ ] **Room switch:** switch to another room, then back — new incoming messages still get
      translated (the observer re-attaches when `#_timeLine` node changes).
- [ ] **Scroll history:** scroll up to load old messages — no request storm / no console
      flood (only real-time new messages should auto-translate; verify behavior).
- [ ] **Mentions / emoji:** a message with a `[To:]` mention or an emoji stays intact in
      the original; the translated block reads sensibly. NOTE: rendered emoji are `<img>`
      in the DOM, so they don't appear in the translated text line — confirm this is
      acceptable (see `src/adapters/SELECTORS.md` finding #2).
- [ ] **Rate limit:** send/receive several messages quickly — the chat UI stays responsive,
      errors (if any) are `console.warn`, not crashes.
- [ ] **Blank target behavior:** with a blank target somehow set, a translate attempt logs
      a warning and does not crash (see review note).

## Known v1 limitations (not bugs — expected)

- Emoji shortcode / `[rp]` tokenizer patterns are best-effort and mainly protect the
  OUTGOING textarea path; incoming rendered emoji are images and drop from the text line.
- No per-message Translate button when auto is OFF (deferred; auto path is the v1 focus).
- No toolbar icon image bundled (Chrome shows a default; optional polish).
- `TtlCache` in the background is in-memory only; cleared when the MV3 worker unloads.
