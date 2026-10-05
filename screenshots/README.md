# Inbox UI Reference — Screenshots & Assets

Reference only (press screenshots © their outlets/Google; APK art © Google).
Do not redistribute commercially. Trusted visual companion:
`baestheorem/inbox-by-gmail-clone` `docs/DESIGN.md` — full reverse-engineered
visual spec with confidence tags per value.

## press/ (28 files, verified image data)

Verified genuine Inbox UI (spot-checked `wiki-android.png`: blue toolbar,
pin-toggle, Today/Yesterday groups, bundle rows, inline photo Highlights, red FAB).

| File | Shows | Recreate from it |
|---|---|---|
| `wiki-android.png` (237×421) | Android list: toolbar, pin toggle, bundles, photo Highlight, FAB | Main list layout, toolbar, bundle row |
| `web-main.png`, `muo-web.png` | Web client layout | Web column widths, accordion |
| `mobile-card-4/5.png` | Mobile cards/Highlights | Highlight card internals |
| `mobile-vs-desktop.jpg` | Phone vs web side-by-side | Cross-platform parity |
| `muo-inbox-slide.png`, `muo-sliding.png` | Swipe/shortcut affordances | Swipe rows, shortcut hints |
| `muo-vs-gmail.png` | Inbox vs Gmail message view | Conversation-view differences |
| `muo-purchases.png`, `muo-create-label.png` | Purchases bundle, bundle creation | Bundle row, create flow (`bt_edit_cluster_*` layouts) |
| `muo-done.png` | Done/empty state | Done view, `bt_ic_zero_done` |
| `muo-pinned.png` | Pinned view | Pinned toggle + filter |
| `muo-reminders.png` | Reminders inline | Reminder rows + red FAB |
| `muo-compose.png` | Compose windows | Compose layout (`bt_compose_view`) |
| `trips-2015.png`, `trip-bundles(-1).jpg` | Trip bundles itinerary | Trip card (`bt_topic_trip_cluster_summary_view`) |
| `snooze-2018.jpg` (2018 UI) | Late-era snooze menu | Snooze grid (`bt_snooze_dialog_grid`) |
| `gesture.jpg` + `gesture-anim.gif` | Swipe gestures animated | Swipe physics/directions |
| `smartreply-2016.png` | Smart Reply strip | `SmartreplyWidget` placement |
| `anp-2015.png`, `gz-a13/a15/a27.png` | 2014–15 era reviews | Early-era chrome |
| `inbox-zero.webp` | Zero state | Sunny empty state |
| `logo.png` (512², Commons) | Official logo | App icon / branding |

Lost: 7 `elementalstudios.us` images (site blocks hotlinking, 404).
`app-16/17` also blocked there — skip; coverage above is complete.

## apk-assets/ (27 files, extracted from v1.22 APK)

- Zero states: `bt_ic_zero_{done,pinned,reminders,system_saved}`
- Onboarding: `bt_oobe_m_001–004`, `bt_ic_oobe_{clusters,reminder,smartmail,snooze,pagedots}`
- Triage: `bt_ic_pintoggle_*`, `bt_bg_pintoggle_*`, `bt_ic_sweep_*`, `bt_ic_reminder_*`, `bt_ic_snoozefilled_*`, `bt_ic_onboarding_sweep`
- Trips art: `bt_il_cv_trips.webp`, `bt_il_tl_trips.png`

## Layout blueprint (in `../inbox-dec/res/layout/`)

Rebuild screens from these decoded layouts:
- Main stream: `bt_brick_activity`, `bt_item_list_cluster_summary`, `bt_item_list_summarized_conversation_entry`
- Trip/Smartmail cards: `bt_topic_trip_cluster_summary_view`, `bt_topic_smartmail_cluster_summary_view`
- Snooze: `bt_snooze_dialog`, `bt_snooze_dialog_grid`, `bt_snooze_banner`, `bt_snooze_menu_option_spinner`
- Compose: `bt_compose_view`, `bt_speed_dial_compose_view`, `bt_compose_task_fragment`
- Bundle config: `bt_onboarding_bundle_configurator`, `bt_cluster_settings_list`, `bt_cluster_preferences_layout`, `bt_edit_cluster_{name,filter_row}`, `bt_cluster_move_to_dialog`
- Conversation: `bt_detailed_conversation_expanded_message`, `bt_item_list_expanded_conversation_header`
- Onboarding: `bt_onboarding_screen`, `bt_onboarding_fragment`, `bt_oobe_screen_{0-3}` (tablet in `layout-sw600dp`)
- Search: `bt_search_card`, `bt_search_error_view`
