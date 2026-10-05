# Inbox Reborn — Android app

Kotlin + Jetpack Compose + Material 3 (dynamic color on Android 12+).
Package `com.inboxreborn.app`, minSdk 26, target/compile 34.

## Build

Requires JDK 17 and the Android SDK (platform 34, build-tools 34.0.0):

```sh
export ANDROID_HOME=/opt/android-sdk   # or ~/Android/Sdk
gradle assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

Gradle 8.10+ downloads AGP 8.5.2 / Kotlin 2.0.20 from the plugin portal on
first run (network required).

## Structure

- `MainActivity.kt` — route switch (Inbox ↔ Bundle) + sheet/dialog state.
- `ui/InboxScreen.kt` — M3 inbox: toolbar, pin filter, search, tab chips,
  bundle cards, thread rows, FAB, Snackbar UNDO.
- `ui/Sheets.kt` — bundle detail, snooze bottom sheet, reminder dialog.
- `ui/InboxViewModel.kt` — triage ops (Done/Pin/Snooze/Sweep/Undo) + verbatim
  APK snooze presets; seed data mirrors the web app.
- `ui/theme/Theme.kt` — Material 3 dynamic color theme.
- `model/Models.kt` — ThreadItem / Bundle / Tab.
