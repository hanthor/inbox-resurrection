# Inbox Resurrection

Rebuild of Inbox by Google as a thin Gmail-API client. See `SPEC.md` (product),
`IMPLEMENTATION_PLAN.md` (phases), `screenshots/` (UI reference).

## Layout

- `core/` — pure rule library (cluster predicates, throttling, snooze presets).
  Zero deps, `node --test test/`.
- `backend/` — sync/push/enrichment service (Phase 0: health stub only).
- `web/` — PWA; Phase 0 = static mocks (`index.html`, no build).
- `mobile/` — one app framework, Phase 3.

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
