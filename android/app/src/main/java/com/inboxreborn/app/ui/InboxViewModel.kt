package com.inboxreborn.app.ui

import androidx.lifecycle.ViewModel
import com.inboxreborn.app.model.Bundle
import com.inboxreborn.app.model.Tab
import com.inboxreborn.app.model.ThreadItem
import com.inboxreborn.app.model.Throttling
import java.time.DayOfWeek
import java.time.LocalDateTime
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class InboxUiState(
    val threads: List<ThreadItem> = emptyList(),
    val bundles: List<Bundle> = emptyList(),
    val tab: Tab = Tab.INBOX,
    val pinnedOnly: Boolean = false,
    val query: String = "",
    /** Last mutating action, for Snackbar UNDO. Null when nothing to undo. */
    val pendingUndo: Undoable? = null,
)

data class Undoable(val label: String, val restore: () -> Unit)

/** Snooze presets — verbatim option ids from the Inbox APK strings. */
enum class SnoozePreset(val label: String) {
    LATER_TODAY("Later today"),
    TOMORROW("Tomorrow"),
    THIS_WEEKEND("This weekend"),
    NEXT_WEEK("Next week"),
    SOMEDAY("Someday"),
}

fun resolveSnooze(preset: SnoozePreset, base: LocalDateTime = LocalDateTime.now()): LocalDateTime =
    when (preset) {
        SnoozePreset.LATER_TODAY -> base.withHour(20).withMinute(0).withSecond(0)
        SnoozePreset.TOMORROW -> base.plusDays(1).withHour(8).withMinute(0).withSecond(0)
        SnoozePreset.THIS_WEEKEND -> {
            var d = base
            do { d = d.plusDays(1) } while (d.dayOfWeek != DayOfWeek.SATURDAY)
            d.withHour(8).withMinute(0).withSecond(0)
        }
        SnoozePreset.NEXT_WEEK -> {
            var d = base.plusDays(1)
            while (d.dayOfWeek != DayOfWeek.MONDAY) d = d.plusDays(1)
            d.withHour(8).withMinute(0).withSecond(0)
        }
        SnoozePreset.SOMEDAY -> base.plusDays(30).withHour(8).withMinute(0).withSecond(0)
    }

class InboxViewModel : ViewModel() {
    private val _ui = MutableStateFlow(InboxUiState(threads = seedThreads(), bundles = seedBundles()))
    val ui: StateFlow<InboxUiState> = _ui.asStateFlow()

    private fun mutate(label: String, change: (List<ThreadItem>) -> List<ThreadItem>) {
        val before = _ui.value.threads
        _ui.update { it.copy(threads = change(before), pendingUndo = null) }
        _ui.update { s -> s.copy(pendingUndo = Undoable(label) { _ui.update { it.copy(threads = before, pendingUndo = null) } }) }
    }

    fun consumeUndo() = _ui.update { it.copy(pendingUndo = null) }

    fun markDone(id: String) = mutate("Marked done") { list ->
        list.map { if (it.id == id) it.copy(done = true) else it }
    }

    fun restore(id: String) = mutate("Restored") { list ->
        list.map { if (it.id == id) it.copy(done = false) else it }
    }

    fun togglePin(id: String) {
        _ui.update { s ->
            s.copy(threads = s.threads.map { if (it.id == id) it.copy(pinned = !it.pinned) else it })
        }
    }

    fun snooze(ids: Set<String>, fireAtMillis: Long) = mutate("Snoozed") { list ->
        list.map { if (it.id in ids) it.copy(snoozedUntil = fireAtMillis) else it }
    }

    fun unsnooze(id: String) {
        _ui.update { s ->
            s.copy(threads = s.threads.map { if (it.id == id) it.copy(snoozedUntil = 0) else it })
        }
    }

    fun sweep(bundleId: String) = mutate("Swept bundle") { list ->
        list.map { if (it.bundleId == bundleId && !it.done) it.copy(done = true) else it }
    }

    fun addReminder(title: String) {
        _ui.update { s ->
            s.copy(threads = s.threads + ThreadItem(
                id = "r${System.currentTimeMillis()}",
                kind = ThreadItem.Kind.REMINDER,
                subject = title.ifBlank { "Untitled reminder" },
                snippet = "Reminder",
            ))
        }
    }

    fun setTab(tab: Tab) = _ui.update { it.copy(tab = tab) }
    fun setPinnedOnly(v: Boolean) = _ui.update { it.copy(pinnedOnly = v) }
    fun setQuery(q: String) = _ui.update { it.copy(query = q) }

    fun visibleThreads(): List<ThreadItem> {
        val s = _ui.value
        val now = System.currentTimeMillis()
        return s.threads
            .filter { t ->
                if (s.query.isNotBlank() &&
                    !(t.subject + " " + t.snippet + " " + t.from).contains(s.query, ignoreCase = true)
                ) return@filter false
                if (s.pinnedOnly && !t.pinned) return@filter false
                when (s.tab) {
                    Tab.INBOX -> !t.done && !t.isSnoozed
                    Tab.SNOOZED -> !t.done && t.isSnoozed
                    Tab.DONE -> t.done
                    Tab.REMINDERS -> t.kind == ThreadItem.Kind.REMINDER && !t.done && !t.isSnoozed
                }
            }
            .sortedByDescending { it.timestampMillis }
    }

    companion object {
        private fun seedThreads(): List<ThreadItem> {
            val now = System.currentTimeMillis()
            val h = 3_600_000L
            return listOf(
                ThreadItem("t1", from = "Chris Sadler", subject = "Business trip",
                    snippet = "I made a reservation for the hotel you talked about…",
                    timestampMillis = now - h, pinned = true),
                ThreadItem("t2", from = "Japan Airlines", subject = "Flight confirmation SFO → NRT",
                    snippet = "Departs Friday 11:20 · Terminal 3",
                    assist = "Departs Fri 11:20 · Terminal 3 · On time",
                    timestampMillis = now - 2 * h, bundleId = "travel"),
                ThreadItem("t3", from = "Imperial Tokyo", subject = "Hotel: 3 nights, #TK-881",
                    snippet = "Check-in from 3 PM", assist = "Check-in 3 PM · map · #TK-881",
                    timestampMillis = now - 3 * h, bundleId = "travel"),
                ThreadItem("t4", from = "Shoehop", subject = "Your order has shipped",
                    snippet = "Tracking 1Z-8842 · arrives Thursday",
                    assist = "Tracking 1Z-8842 · arrives Thu",
                    timestampMillis = now - h / 2, bundleId = "purchases"),
                ThreadItem("t5", from = "Debra Kumar", subject = "Weekend at Yosemite",
                    snippet = "Here are photos from our weekend trip. [2 photos]",
                    assist = "2 photos attached", timestampMillis = now - h / 4),
                ThreadItem("t6", from = "Richard, Matthew, me", subject = "Photography classes",
                    snippet = "I really would love to get some photos… (4 messages)",
                    timestampMillis = now - 26 * h),
                ThreadItem("r1", kind = ThreadItem.Kind.REMINDER, subject = "Call the dentist",
                    snippet = "Reminder", timestampMillis = now - h / 6),
            )
        }

        private fun seedBundles() = listOf(
            Bundle("travel", "Travel"),
            Bundle("purchases", "Purchases"),
            Bundle("finance", "Finance", Throttling.ONCE_A_DAY),
        )
    }
}
