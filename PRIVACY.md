# Privacy Policy — Chatwork Translate

_Last updated: 2026-07-14_

Chatwork Translate is a browser extension that adds two-way translation inside
Chatwork. This policy explains what data the extension handles and where it goes.

## What data is processed

| Data | Purpose | Destination |
|---|---|---|
| Message text you view or draft in Chatwork | To produce a translation | Google Translate web endpoint (`translate.googleapis.com`) |
| Your settings (target languages, auto-translate toggle) | To remember your preferences | Stored locally via `chrome.storage`, on your device only |

## How translation works

- When a message needs translating, its **text only** is sent to the public Google
  Translate endpoint over HTTPS to get the translated text back.
- No message is ever sent on your behalf. The extension only fills the compose box
  when you click **Apply**; you always press Chatwork's own Send button yourself.
- Translations are cached in memory temporarily to reduce repeat requests.

## What we do NOT do

- We do **not** run our own servers and do **not** collect, store, or transmit your
  data to us.
- We do **not** sell or share data with third parties.
- We do **not** collect names, emails, credentials, message history, or any Chatwork
  account information.
- We do **not** use analytics, tracking, or advertising.

## Data retention

- Settings stay in your browser's local storage until you remove them or uninstall
  the extension.
- Translation text is not retained by the extension after a translation completes
  (beyond a short-lived in-memory cache that clears on browser restart).

## Third-party service

Translation is performed by Google Translate. Text sent for translation is subject to
Google's own privacy terms. Only the text to be translated is sent — no identifying
metadata is attached by this extension.

## Permissions

- `storage` — to save your settings on your device.
- Host access to `*.chatwork.com` — so the extension can read and augment messages on
  Chatwork pages only. It runs on no other sites.

## Contact

For questions about this policy, contact the extension owner.
