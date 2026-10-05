# Inbox by Google — Resurrection Spec (v1.0)

Source: deep-research workflow (8 agents, completed) + web verification.
Goal: faithful rebuild + 2026 modernization. Gmail-API compatible layer, not a mail server.

## 1. Vision & principles

1. Inbox = todo list, not archive. Every item ends in Done, Snoozed, or Pinned.
2. Group, don't list. Bundles collapse similar mail into one row (header icon + count).
3. Glanceable. Highlights + Assists surface the payload (times, phones, maps, tracking, flight status) without opening.
4. Interrupt on my terms. Default bundle delivery batching + Snooze + high-priority-only notifications.
5. Forgiving. Every destructive/bulk action has Undo snackbar.

History: invite-only Oct 2014, open May 2015, sunset Apr 2 2019. Gmail kept Snooze / Smart Reply (+Smart Compose) / Nudges / high-priority notifications. Gmail lost: Bundles (esp. Trips/Purchases/Finance), Pins, native Reminders, Save-to-Inbox, Highlights/Assists richness.

## 2. Feature inventory (all pieces, with exact behavior)

### 2.1 Bundles (core)
- Auto-group into collapsible row: bundle header (icon, name, unread/total count), items grouped under Today / Yesterday / This month.
- Defaults (9): Travel/Trips, Purchases, Finance, Social, Updates, Forums, Promos, Low Priority + custom bundles.
- Custom bundles via Gmail label/filter mapping: "automatically populate bundle" rule builder.
- Per-bundle delivery: Show in inbox in real-time | Once a day 7AM | Once a week Mon 7AM.
- Per-bundle notification override; per-bundle Done (Sweep) in one tap.
- Empty-bundle and low-density cards; sunny empty-state illustration on Inbox Zero.

### 2.2 Done (not Delete)
- Done = Gmail Archive (remove from inbox → All Mail / Done view). Green check or swipe-right.
- Reversible, global Undo snackbar (~7s). Distinct from Delete/Spam.
- Bulk: Sweep bundle, month-sweep ("sweep all older than 30 days").

### 2.3 Pins
- Blue thumbtack, replaces Star. Pinned items float to top; Pinned-only toggle / `is:pinned` search.
- Pin survives Sweep. Done clears pin. Pins sync to a Gmail `Inbox/Pinned` label for compat.

### 2.4 Snooze
- Applies to mail AND reminders. Leaves Inbox → Snoozed tab; returns to TOP as new with clock badge + push notification.
- Presets: Later today (8pm), Tomorrow (8am), This weekend / Later this week, Next week (Mon 8am), Someday (random future delight), Pick date & time, Pick place (Work/Home — mobile-only, geofenced).
- Web used hover + keyboard (`s`); mobile swipe-left (clock, amber).

### 2.5 Reminders (first-class)
- Red FAB → Reminder composer; reminders sit inline at top like pinned mail.
- Same ops as mail: pin / snooze / done. Location + time triggers.
- Smart Reminders (May 2015): suggest reminders from mail content (e.g. "call bank").

### 2.6 Highlights
- Extract and render at glance without open: flight itineraries, hotel/event info, embedded photos, documents, links.
- Live enrichments: real-time flight status, package delivery status.

### 2.7 Assists
- Context cards above thread: business phone/hours/map for reservations, itinerary + check-in links, shipment tracking, contact quick-actions, calendar event creation.
- Triggered by schema.org mail markup + entity extraction.

### 2.8 Smart Reply / Compose
- 3 one-tap candidate replies under thread (~10% of mobile replies at web launch per Google).
- Extend to Smart Compose + tone control in resurrection (2026 model upgrade).

### 2.9 Nudges / Follow-ups
- "Received X days ago. Reply?" / "Sent X days ago. Follow up?" — bump to top with colored annotation.
- Configurable windows (default 3/7 days), dismissible.

### 2.10 Smart bundles detail
- **Trips**: all flights/hotels/cars/events for a trip in one itinerary bundle with dates, confirmation codes, maps.
- **Purchases**: order confirmations + shipping + delivery in one card with tracking.
- **Finance**: bills, statements, receipts; due-date extraction → auto-reminder suggestion.
- **Social/Updates/Forums/Promos/Low Priority**: batched promo/social with one-tap Done.

### 2.11 Triage UX
- Mobile swipes: left = Snooze (amber, fixed); right configurable Done (green, default) or Move to Trash (per `bt_right_swipe_actions`).
- Web: hover actions + shortcuts (`p` pin, `s` snooze, `e`/`Backspace` done, `r` remind).
- Bulk select, undo send (5/10/20/30s), attachment strip with Drive/Photos preview.

### 2.12 Search / IA
- Tabs: Inbox, Pinned, Snoozed, Done, Reminders, Drafts, Sent, Trash, Spam + Bundles list + unbundled labels.
- Search operators: `is:pinned is:snoozed in:trips in:purchases`, date/recency facets, Assists-aware search (tracking numbers, venues).

### 2.13 Notifications & Settings
- High-priority-only push by default; per-bundle/per-person overrides; quiet-hours respect bundle digest schedule.
- Settings: bundle rules, swipe confirm, snooze defaults (time + place), digest times, Undo duration, density.

### 2.14 Platforms
- Android + iOS + Web (Material) + optional desktop PWA/Menu-bar. Offline read/triage queue with conflict-free sync.

## 3. IA & key flows

- Inbox stream: [Reminder zone] → [Pinned] → [Today bundles/threads] → [Yesterday] → [This month]. Bundle row expands inline.
- Triage flow: glance Highlight/Assist → swipe Done / Snooze / Pin → Undo available → Zero → sunny state.
- Snooze flow: pick preset/date/place → confirm chip → item vanishes with toast "Snoozed to … Undo" → returns as new.
- Trip flow: booking mails arrive → auto-merge to Trips bundle → itinerary card builds → day-of flight-status Assist goes live.

## 4. Data model & sync

- No mail store: thin client over Gmail API (or Outlook via Graph adapter).
- Mapping: Done=archive; Pin=`INBOX_PINNED` label; Snooze=remove INBOX + scheduled re-add (Cloud Tasks / local scheduler); Reminder=`INBOX_REMINDER` object with due/geo; Bundle=Gmail label + rule.
- Bundle rule engine: sender + subject + schema markup + List-Id → bundle id. Deterministic + user override stored per user.
- Offline: SQLite queue of triage ops (done/pin/snooze), last-write-wins with server reconcile; max 30-day sync window.
- Privacy: OAuth minimal scopes, markup parse on device where possible, shipment/flight enrichment opt-in.

## 5. Integrations

- Calendar: event mail → one-tap add; snooze-to-event-time; Reminders appear as all-day Calendar items.
- Keep/Tasks: Reminder two-way sync; "Save to Inbox" share-extension → link/note becomes inbox item.
- Drive/Photos: attachment strip inline preview; one-tap save.
- Contacts: avatar + Assist quick-call/directions.

## 6. Intelligence pipeline (2026 rebuild)

1. Ingest (Gmail push) → 2. Classify (bundle classifier, DistilBERT-size, user-tunable) → 3. Extract (itinerary/order/bill schemas + LLM fallback) → 4. Enrich (flight/track/map APIs, cached) → 5. Rank (priority + Nudge scorer) → 6. Render (Highlight/Assist card JSON → shared card renderer web/mobile).
- Smart Reply served by on-device/small LLM with allowlist tone; no training on user mail without opt-in.

## 7. MVP scope

- P0: Bundles (incl. Trips/Purchases/Finance), Done, Pin, Snooze (time), Reminders, Highlights-basic, Undo, Search, Gmail OAuth, Android+iOS+Web, offline queue.
- P1: Location snooze, Assists-live (flight/track), Smart Reply, Nudges, digest scheduling, Save-to-Inbox.
- P2: Custom bundle builder UI, desktop PWA, Outlook adapter, team triage.

## 8. Gmail kept vs lost → differentiators

Kept by Gmail: Snooze, Smart Reply/Compose, Nudges, high-priority notifs, gestures.
Lost (our moat): auto-bundling (Trips/Purchases/Finance), Pins, native Reminders, Highlights/Assists depth, Sweep/Zero philosophy, clean low-density stream.
Positioning: "The triage layer Gmail never shipped" — bring your Gmail, get Inbox back.

## 9. Open questions / risks

1. Gmail API label/rate limits for bundle fan-out at scale?
2. Geofenced snooze on iOS background limits — acceptable degradation?
3. Flight/tracking enrichment data licensing?
4. Star→Pin migration path for ex-Inbox/Gmail power users?
5. Offline conflict UX when same thread triaged on two devices?

## Appendix A — APK reverse-engineering (last APK, v1.22 / versionCode 5942291, platform 6.0-2166767)

Decoded with apktool 2.7.0 to `inbox-dec/` (15,448 smali files). Code is ProGuard-obfuscated (`Lbhs`, `Lcey`…) so a jadx pass would not restore class/method names — string + resource + manifest analysis is the practical ceiling, and it is done.

- Package `com.google.android.apps.bigtop`, app `BigTopApplication`, label "Inbox". Providers: `bigtopprovider` (private, syncable) + `taskprovider` (exported, syncable) + FileProvider; sync-adapter accountType `com.google`, always-syncable.
- Activities: `MainActivity`, `ConversationViewActivity`, `ComposeMessageActivity` (+Alias/Shortcut), `SnoozeItemDialogActivity`, `CreateTaskDialogActivity` (+Shortcut), `ShareHandlerActivity` (Save-to-Inbox), `BarcodeActivity`, `OnboardingWelcomeScreensActivity`, `BigTopPreferenceActivity`, `BigTopPhotoViewActivity`. Fragments: `SnoozePrefsFragment`, `LabelsAndNotificationsPrefsFragment`, `ExperimentOverridesPreferenceFragment`.
- CORRECTION to §2.11: right swipe is configurable — `bt_right_swipe_actions` = Done | Move to Trash (default Done). Left swipe = Snooze.
- Bundles are "clusters" internally (`ClusterFilterRowContainer`, `BundleConfiguratorScrollView`). Filter predicates: From / To / Subject / Includes / Excludes, combinable with And; automate prompts ("Always add messages from %1$s to %2$s", exclude variants). Delivery ("throttling"): As messages arrive | Once a day (7 AM) | Once a week (Mon 7 AM). Validation: name required, no `^`, length cap. Unbundle flow restores individual delivery. Onboarding demo clusters: promos "Blitz Air, Running Club, Rabbit Facts", purchases "Shoehop, Creek Farms, Dollar Auction".
- Snooze options verbatim: Later today, Tomorrow, This week / Later this week, Next week / Later next week, This/Next weekend, Someday, Last (repeat), day-parts (Morning/Afternoon/Evening/Night/Anytime/Custom/Silent), Pick date & time, Pick place. Customizable preset times ("Afternoon set to %1$s" etc.). Timezone-travel flow: "Traveling? … update snoozed Emails and Reminders" (prompt/always/never). Location consent covers place-snooze + reminder suggestions.
- Smart Reply: `SmartreplyWidget` ("Creating smartreply widget."), section "To Reply", callout "Start composing your reply with one tap", per-suggestion a11y + "Bad suggestions?" feedback; Wear canned choices Yes/No/OK/hehe/Thanks.
- Permissions: location (geo-snooze), contacts (autocomplete), vibrate/wake/boot (notifications + re-poll), storage/download, shortcuts, C2D. `user_prefers_bigtop_data` auto/force-on/force-off (server-vs-local data experiment).
- Preserved artifacts: `inbox-last.apk` (19MB) + full `inbox-dec/` tree (148MB) + `screenshots/` (28 press shots, 27 extracted APK assets, README catalog with layout blueprint).

## Appendix B — evidence refs (workflow)

Bundles auto-group/collapsible; 9 defaults + custom via labels; delivery real-time/daily-7AM/weekly-Mon-7AM; Done=archive+Undo; Pin replaces star, survives sweep, `is:pinned`; swipes right=Done/left=Snooze; Snooze presets incl. Someday + Work/Home; returns to top with clock badge; Reminders FAB red first-class; Assists enrich + Smart Reminders 5/2015; Zero/Sweep/sunny empty state; lifecycle 10/2014–4/2/2019; kept vs lost split; Highlights extract flight/event/photo/doc + live status; Smart Reply 3 candidates ~10% mobile; Nudges bump with annotation.
