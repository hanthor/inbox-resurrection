package com.inboxreborn.app.model

/** Bundle delivery throttling — exact values from the Inbox APK. */
enum class Throttling { AS_ARRIVES, ONCE_A_DAY, ONCE_A_WEEK }

data class Bundle(
    val id: String,
    val name: String,
    val throttling: Throttling = Throttling.AS_ARRIVES,
)

/** A triage item: mail or first-class reminder. */
data class ThreadItem(
    val id: String,
    val kind: Kind = Kind.MAIL,
    val from: String = "",
    val subject: String,
    val snippet: String = "",
    /** Highlights/Assists glance line, null when none. */
    val assist: String? = null,
    val timestampMillis: Long = System.currentTimeMillis(),
    val bundleId: String? = null,
    val pinned: Boolean = false,
    val done: Boolean = false,
    /** Epoch millis to return to inbox, 0 = not snoozed. */
    val snoozedUntil: Long = 0,
) {
    enum class Kind { MAIL, REMINDER }
    val isSnoozed: Boolean get() = snoozedUntil > System.currentTimeMillis()
}

enum class Tab { INBOX, SNOOZED, DONE, REMINDERS }
