# Chatwork Translate Extension — Implementation Plan (Index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Manifest V3 Chrome extension that does two-way translation inside Chatwork — auto/manual translate incoming messages and translate outgoing drafts with a preview.

**Architecture:** Four isolated layers — content script (DOM), background service worker (translate proxy + cache + rate-limit), site adapter (all Chatwork selectors in one file), translation engine (Google endpoint in one file). Content never calls Google directly; everything routes through the background worker.

**Tech Stack:** Chrome MV3, vanilla JS (ES modules), Vitest + jsdom for tests, Google Translate keyless web endpoint.

**Spec:** `docs/superpowers/specs/2026-07-02-chatwork-translate-extension-design.md`

---

## How this plan is split

This plan is split across sibling files (each ≤ 300 lines). Execute in order:

1. **[Part 1a — scaffold, settings, engine](2026-07-02-chatwork-translate-part1a-foundation.md)** — Task 0–2
   - Task 0: Project scaffold (npm, Vitest, manifest, dirs)
   - Task 1: `shared/settings.js` (chrome.storage wrapper) — TDD
   - Task 2: `translate/google.js` (engine, mocked fetch) — TDD
2. **[Part 1b — tokenizer, dedupe](2026-07-02-chatwork-translate-part1b-foundation.md)** — Task 3–4
   - Task 3: `shared/tokenizer.js` (CW mention/emoji/link protection) — TDD
   - Task 4: `shared/dedupe.js` (message id + text-hash dedupe) — TDD
3. **[Part 2 — Background worker](2026-07-02-chatwork-translate-part2-background.md)** — Task 5–6
   - Task 5: `background/cache.js` + rate-limit queue — TDD
   - Task 6: `background/service-worker.js` (message handler wiring)
4. **[Part 3a — DOM survey + adapter](2026-07-02-chatwork-translate-part3a-adapter.md)** — Task 7–8
   - Task 7: Survey live Chatwork DOM + save HTML fixture (MANUAL, gates the rest)
   - Task 8: `adapters/adapter.js` base contract + `adapters/chatwork.js` — TDD (jsdom fixture)
5. **[Part 3b — Message observer](2026-07-02-chatwork-translate-part3b-observer.md)** — Task 9
   - Task 9: `content/observer.js` (MutationObserver + loop guard) — TDD (jsdom)
6. **[Part 3c — Content wire-up + popup](2026-07-02-chatwork-translate-part3c-content.md)** — Task 10–11
   - Task 10: `content/ui.js` + `content/index.js` (wire-up, buttons, preview)
   - Task 11: `popup/` settings UI + manual verification checklist

## File map (what each file owns)

| File | Responsibility | Tested by |
|---|---|---|
| `manifest.json` | MV3 manifest, permissions, entry points | manual load |
| `src/shared/settings.js` | read/write chrome.storage (target lang, toggle) | Vitest (mock chrome) |
| `src/shared/tokenizer.js` | protect `[To:]`/emoji/URL as placeholders + restore | Vitest (pure) |
| `src/shared/dedupe.js` | dedupe key = id + text hash; artifact test | Vitest (pure) |
| `src/shared/messaging.js` | typed message constants content↔background | (used, thin) |
| `src/translate/google.js` | `translate(text,target)→{text,detectedLang}` | Vitest (mock fetch) |
| `src/background/cache.js` | in-memory TTL cache + sequential rate-limited queue | Vitest (fake timers) |
| `src/background/service-worker.js` | onMessage handler → cache → google | manual |
| `src/adapters/adapter.js` | base contract (throws if not implemented) | Vitest |
| `src/adapters/chatwork.js` | ALL Chatwork selectors + DOM ops | Vitest (jsdom fixture) |
| `src/content/observer.js` | MutationObserver, debounce, loop guard | Vitest (jsdom) |
| `src/content/ui.js` | inject buttons, translation block, compose preview | manual |
| `src/content/index.js` | pick adapter, boot observer, message glue | manual |
| `src/popup/popup.{html,js}` | settings UI | manual |
| `tests/fixtures/chatwork.html` | real DOM snapshot for adapter tests | — |

## Global conventions (apply to every task)

- **Language of message text:** never hard-code source lang; Google auto-detects. Target comes from settings.
- **Commit granularity (user rule):** one logical commit per task after its tests are green — not per step. Steps that say "Commit" mark the task-level commit.
- **Commit messages:** English, no AI attribution trailer.
- **File size:** keep each source file ≤ 500 lines; test files exempt.
- **Never** let the extension click Chatwork's Send button.

## TDD scope note (user rule requires stating skips)

- **TDD applies** to: Task 1–5, 8, 9 (pure logic + jsdom-testable DOM ops). Tests first → user review → red → implement.
- **TDD skipped** (state reason before starting): Task 0 (scaffold/config, no runtime behavior), Task 6 (service-worker glue — thin, needs live chrome runtime; covered by cache/google unit tests + manual), Task 7 (manual DOM survey), Task 10–11 (live-DOM UI + popup — no feasible automated harness for Chatwork SPA; manual checklist instead).

## Execution order & gates

- Part 1 and Part 2 have **no dependency on live Chatwork** → can be fully built + tested offline first.
- **Task 7 is a hard gate:** Part 3 adapter tests need the real DOM fixture. Do Task 7 before Task 8.
- Task 7 requires the user to be logged into Chatwork; it is done on the user's machine (browser tools or manual export).
