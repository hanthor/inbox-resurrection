# Inbox Resurrection

Rebuild of Inbox by Google as a thin Gmail-API client. See `SPEC.md` (product),
`IMPLEMENTATION_PLAN.md` (phases), `screenshots/` (UI reference).

## Layout

- `core/` — pure rule library (cluster predicates, throttling, snooze presets).
  Zero deps.
- `backend/` — zero-dependency Node service: Gmail triage ops, Google Tasks
  reminders, snooze scheduler, enrichment. Routes and live-Gmail setup in
  `backend/README.md`.
- `web/` — PWA (`index.html`, `app.js`, `styles.css`; no build step).
  `backend.js` is an optional adapter that talks to `backend/`; without it the
  app runs fully local. Playwright tests live in `web/tests/`.
- `android/` — Kotlin + Jetpack Compose app; build steps in `android/README.md`.
- `mobile/` — notes on must-have mobile behaviours from the APK findings.
- `scripts/publish-pages.sh` — publishes `web/` to the `gh-pages` branch
  (run by `.github/workflows/publish.yml` on pushes to `main`).

## Run and test

Requires Node.js (the suites use the built-in `node --test` runner).

```sh
(cd core && node --test test/rules.test.mjs)      # 5 tests
(cd backend && npm test)                          # 9 tests, mocked fetch
python3 -m http.server 8901 --directory web       # serve the web app
```

The web tests need Playwright's browser, installed once; the test config
starts its own static server on port 8901:

```sh
cd web/tests
npm ci
npx playwright install chromium
npx playwright test                               # 12 tests
```

On a minimal Linux host Chromium may fail to start with a missing shared
library error; run `npx playwright install-deps chromium` (needs sudo) first.

## Label mapping (decided, Phase 0)

Done=archive · Pin=`INBOX_PINNED` · Snooze=remove INBOX + scheduled re-add ·
Reminder=first-class object · Bundle=Gmail label + filter rule.

## Gmail OAuth (Phase 1 spike)

Minimal scopes: `gmail.modify` + `gmail.labels`; push via Cloud Pub/Sub watch.
Must verify label/rate limits before bundle fan-out (SPEC §9 Q1).

## Copyright / what's in this repo

This repo contains only original work (MIT, see `LICENSE`): spec, plan, rule
library, service stub, static mocks, docs. It does **not** contain Google's
APK, decompiled code, extracted artwork, or press screenshots — those stay
local (see `.gitignore`). To reproduce the local reference set: supply your
own legally-obtained Inbox APK as `inbox-last.apk`, decode with
`apktool d`, and run `screenshots/fetch.sh` for press reference images
(reference only, do not redistribute).
