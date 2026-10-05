# Inbox Resurrection — Implementation Plan (v1.0)

## Goal

Rebuild Inbox by Google as a thin client over the Gmail API (no mail store),
faithful to `SPEC.md`, working toward a closed beta in ~20 weeks.

## Success Criteria

- Web PWA triages a real Gmail account to Inbox Zero (Done/Pin/Snooze/Undo).
- Default bundles (Trips, Purchases, Finance, Social, Updates, Forums, Promos,
  Low Priority) + custom bundles with daily/weekly throttling all work.
- Phone + web triage the same account; geo-snooze demos on mobile.
- Every SPEC §8 differentiator (vs stock Gmail) is demoable.

## Context And Current Facts

- `SPEC.md`: full product spec inc. Appendix A (APK findings: v1.22,
  `com.google.android.apps.bigtop`, cluster filter predicates, throttling
  values, verbatim snooze options, right-swipe Done-or-Trash).
- `screenshots/`: 28 press screenshots + 27 extracted APK assets + README with
  layout blueprint (`bt_brick_activity`, cluster summaries, snooze grid…).
- `inbox-dec/`: full apktool decode (manifest, resources, 15,448 smali files,
  ProGuard-obfuscated). `inbox-last.apk` preserved.
- No app code exists. Gmail syncs via Google-account sync adapter with two
  syncable providers (`bigtopprovider`, exported `taskprovider`) — same shape
  the rebuild's backend replaces.

## Constraints And Non-goals

- Thin client only: no mail storage, no new mail protocol.
- Server-side bundle classification lived at Google and is not in the APK; the
  rebuild needs its own classifier (§6 of SPEC).
- Press screenshots are reference-only, no commercial redistribution.
- Non-goals for beta: Outlook adapter, team triage, desktop PWA (P2).

## Key Decisions

1. **Backend owns sync/push/enrichment; clients are triage views.** Why: the
   APK proves this split (syncable providers + account sync settings); snooze
   return, digest timers, and enrichment caching all need a server clock.
2. **Vertical slices per bundle, not horizontal layers.** Why: Trips end-to-end
   (classify → card → notify) demos sooner and de-risks enrichment licensing.
3. **Port cluster semantics as a tested rule library first** (predicates
   From/To/Subject/Includes/Excludes + And, automate prompts, throttling
   as-arrive/daily-7AM/weekly-Mon-7AM, name validation). Why: exact APK values
   are the cheapest correctness anchor we have.
4. **Stack left open (see Open Questions).** Web PWA first, one mobile
   framework after — ordering matters more than the logos.

## Recommended Approach

Phase 0 mocks (no backend) → triage core → bundles → mobile parity →
intelligence → polish/beta. Each phase exits on a demo against the reference
screenshots, not on code volume.

## Work Plan

- **Phase 0 — Decisions & scaffolding (week 1).** Lock stack + monorepo
  (`backend/`, `core/`, `web/`, `mobile/`). Gmail OAuth scopes + push-watch;
  spike label/rate limits (SPEC §9 Q1). Confirm label mapping: Done=archive,
  Pin=`INBOX_PINNED`, Snooze=de-label+schedule, Bundle=label+rule. Static mocks
  of main list, bundle row, snooze grid.
- **Phase 1 — Triage core (weeks 2–4).** Grouped stream, Done/Pin/Snooze,
  Undo on every mutation, offline op queue (last-write-wins), first-class
  Reminders, time-only snooze presets, `is:pinned is:snoozed` search.
- **Phase 2 — Bundles (weeks 5–8).** Cluster engine, default + custom bundles,
  throttling + per-bundle overrides + Sweep, Highlights v1 cards.
- **Phase 3 — Mobile + parity (weeks 9–12).** List/swipes/snooze/compose/push,
  Pick-place snooze + timezone reindex, Save-to-Inbox share, tracking assist.
- **Phase 4 — Intelligence (weeks 13–16).** Live Assists (opt-in cache), Smart
  Reply + feedback, Nudges, digest scheduling, high-priority notifications.
- **Phase 5 — Polish & beta (weeks 17–20).** Onboarding configurator, settings,
  empty states, Star→Pin import, closed beta, latency fixes.

## Validation Plan

- Phase 0: mocks side-by-side with `wiki-android.png` + `muo-web.png`.
- Phase 1: real-account Inbox-Zero run on web; offline queue replay test.
- Phase 2: trips card vs `trip-bundles.jpg` + `bt_topic_trip_cluster_summary`.
- Phase 3: same-account phone+web triage; geo-snooze field demo.
- Phase 4: Smart Reply strip vs `smartreply-2016.png`; Nudge timing test.
- Phase 5: SPEC §8 differentiator checklist vs stock Gmail, all demoable.

## Risks / Rollback

- Gmail label/rate limits → Phase 0 spike; throttle or narrow bundle fan-out.
- iOS background geo limits → degraded manual-place mode accepted.
- Enrichment licensing → cache + opt-in; ship static Highlights first.
- Multi-device conflicts → last-write-wins + toast (no rollback needed; all
  ops reversible via Undo/archive).

## Open Questions

1. Backend language + web/mobile frameworks (your call — recommendation:
   TypeScript backend, PWA first; mobile framework your preference).
2. Enrichment data sources for flight/tracking (licensed API vs screen-scrape
   vs LLM-only, cost-dependent).
3. Beta hosting for push/scheduler (your infra preference).
