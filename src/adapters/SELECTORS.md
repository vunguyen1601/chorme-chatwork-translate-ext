# Chatwork DOM selectors (surveyed from live DOM, room rid=433421779, 2026-07-02)

Captured via chrome-devtools against the logged-in Chatwork SPA. Fixture:
`test/fixtures/chatwork.html` (sanitized — real text/avatars/names scrubbed, structure +
`data-*` + classes kept).

## Golden rule: styled-components classes are NOT stable

Every visual class is a generated styled-components hash: `sc-bRimrq ejURId`, `sc-gAhbiu
pxBmY`, etc. These **change on every Chatwork build** — NEVER select on them. Select only on
**`id`**, **`data-*`**, and Chatwork's stable semantic classes prefixed with `_`
(`_message`, `_timeLine`, `_chatText`, `_replyMessage`).

## Core selectors

| Purpose | Selector | Notes |
|---|---|---|
| Message container (observer root) | `#_timeLine` | stable id |
| Message row | `[data-mid]._message` | stable. `data-mid` = message id |
| Message id (dedupe) | attribute `data-mid` | e.g. `2120714766908657664`, ordered by `data-index` |
| Deleted message | `[data-deleted="1"]` | skip these |
| Message text | `pre` inside the row | styled class unstable → use tag `pre` |
| Author id | `[data-aid]` inside `._speaker` (avatar) | e.g. `data-aid="11290229"` |
| **My account id (isOwn)** | `window.MYID` (string) | e.g. `"11290229"`. isOwn = author `data-aid` === `window.MYID`. **No `_myMessage`/self CSS class exists** — must compare aids |
| Reply sub-block | `._replyMessage.chatTimeLineReply` | shares `data-mid` with parent, has NO `pre` → naturally skipped by "row must contain pre" |
| Compose box | `#_chatText` | **`<textarea>`, NOT contenteditable** — use `.value` + dispatch `input` |
| Compose toolbar / anchor | `#_chatSendArea` | contains `#_emoticon`, `#_to`, `#_file` buttons — anchor the Translate button here |
| Send button (DO NOT click) | `button[data-testid="timeline_send-message-button"]` | text 送信. Extension must never click this |

## Critical findings (differ from plan assumptions)

1. **Compose is a plain `<textarea>` (`#_chatText`), not a rich/contenteditable editor.**
   The spec feared a rich editor; it's actually simpler. `setComposeText` = set `.value`
   then `dispatchEvent(new Event('input', {bubbles:true}))`. Verify the 送信 button enables.

2. **Emoji are rendered as `<img class="ui_emoticon" alt="(bow)">`, NOT as `(bow)` text.**
   So `pre.textContent` does NOT contain `(smile)`-style shortcodes for already-rendered
   emoji — the Task 3 tokenizer emoji pattern won't match them in extracted text. When
   reading `rawText`, decide: either (a) read `pre.textContent` (emoji become their `alt`,
   e.g. `(bow)`, if the browser includes alt in textContent — it does NOT by default;
   img alt is not part of textContent, so emoji simply vanish from rawText), or (b) walk
   child nodes and convert emoji `<img>` back to a placeholder before translating.
   **Task 8/10 decision needed:** simplest v1 = translate `pre.textContent` (emoji dropped
   from the translated line but original message untouched); better = replace emoji `<img>`
   with a protected token. The tokenizer's `(smile)` regex is only useful for the OUTGOING
   path (user types `(smile)` in the textarea as literal text).

3. **`[rp]` reply tags are rendered, not literal.** In the timeline, a reply shows as a
   `._replyMessage` block with text like `返信元<name>` — the raw `[rp aid=.. to=..]`
   markup is NOT present in `pre.textContent`. So the tokenizer's `[rp]` pattern matters
   only for the OUTGOING path (if the user's textarea contains literal `[rp ...]`/`[To:...]`
   after using the To button). Incoming reply blocks are separate nodes without `pre` and
   are skipped.

4. **`window.MYID`** is the reliable current-user id for isOwn. Header/`AC_DATA` probes
   returned null; `window.MYID` returned `"11290229"`. Content script can read it directly
   (same page context).

5. **Consecutive messages from the same author share ONE avatar** — only the first row in
   a run has `[data-aid]`; follow-up rows have NO `[data-aid]` (verified: row 2 in the
   fixture returns `undefined`). So `isOwn` cannot rely on every row carrying an aid.
   **Task 8 handling:** when a row lacks `[data-aid]`, inherit the author from the previous
   row's aid (track "last seen aid" while iterating in DOM order), OR treat unknown-author
   rows conservatively as NOT own (they still get translated — worst case we translate one
   of our own consecutive messages, which is harmless). Recommend the conservative default
   for v1 simplicity; note the trade-off.

## Implication for Task 8 adapter

- `SELECTORS` object: `container:'#_timeLine'`, `message:'[data-mid]._message'`,
  `messageId:'data-mid'`, `text:'pre'`, `authorAid:'[data-aid]'` (query inside row),
  `compose:'#_chatText'`, `composeToolbar:'#_chatSendArea'`,
  `sendButton:'button[data-testid="timeline_send-message-button"]'`.
- `isOwn(row)` = `row.querySelector('[data-aid]')?.getAttribute('data-aid') === window.MYID`.
- `extractMessages`: skip rows without a `pre`, skip `[data-deleted="1"]`, skip
  `._replyMessage`.
- `setComposeText`: textarea `.value` + `input` event (not contenteditable).
