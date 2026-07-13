# Publishing to Chrome Web Store

Step-by-step for publishing **Chatwork Translate** as **Unlisted/Private**.

## 1. Prerequisites

- Google account + one-time **$5** developer registration at
  <https://chrome.google.com/webstore/devconsole>.
- Packaged zip: run `npm run package` → produces `chatwork-translate-<version>.zip`.
- Host the privacy policy (`PRIVACY.md`) at a public URL (e.g. GitHub raw / Pages) —
  the dashboard needs a link, not a file.

## 2. Create the item

1. Dashboard → **Add new item** → upload `chatwork-translate-0.1.0.zip`.
2. Fill the **Store listing** tab (values below).
3. Fill the **Privacy practices** tab (answers below).
4. Under **Distribution / Visibility**, choose **Unlisted** (anyone with the link)
   or **Private** (specific trusted testers only).
5. **Submit for review**.

## 3. Store listing values

- **Name:** Chatwork Translate
- **Summary (≤132 chars):**
  `Two-way translation inside Chatwork — auto-translate incoming messages and preview outgoing drafts before you send.`
- **Category:** Productivity
- **Language:** English (or Japanese/Vietnamese as preferred)
- **Description:**

```
Chatwork Translate adds two-way translation directly inside Chatwork.

- Incoming: messages from others are auto-translated and shown inline, right below the original.
- Outgoing: a Translate button next to the compose box translates your draft and shows a preview. Click Apply to fill the box — the extension never sends for you. You always press Chatwork's own Send button.

Source language is auto-detected. Target languages are configurable (defaults: incoming to Vietnamese, outgoing to Japanese). The extension runs only on chatwork.com and stores your settings locally on your device.
```

## 4. Required assets

- **Icon 128×128:** `icons/icon128.png` ✓ (already present)
- **Screenshot:** at least one, **1280×800** or 640×400 PNG/JPEG.
  Capture a Chatwork room showing the Translate button + an inline translation.

## 5. Privacy practices answers

- **Single purpose:**
  `Translate messages inside Chatwork, in both directions.`
- **Permission justifications:**
  - `storage` — save the user's target-language and toggle settings on-device.
  - Host `*.chatwork.com` — read messages and inject translations on Chatwork pages only.
- **Remote code:** No (all JS ships in the package; no eval/remote scripts).
- **Data usage — declare:**
  - Collects **"Website content"** (message text) → sent to Google Translate for the
    sole purpose of translation. Not sold, not used for unrelated purposes, not for
    creditworthiness/lending.
- **Privacy policy URL:** link to the hosted `PRIVACY.md`.
- Check the three certification boxes about data-handling compliance.

## 6. After submit

- Unlisted/Private items still go through review but are usually faster and less
  strictly scrutinized than public ones.
- Review typically takes a few hours to a few days.
- Once approved, share the item URL (Unlisted) or add testers' emails (Private).

## Notes / risks

- Translation uses the keyless public Google Translate endpoint
  (`src/translate/google.js`). This is unofficial; keeping the item Unlisted/Private
  lowers policy-rejection risk versus a public listing.
- Bump `version` in both `manifest.json` and `package.json` before each new upload —
  the store rejects re-uploads with a version that is not higher than the last.
