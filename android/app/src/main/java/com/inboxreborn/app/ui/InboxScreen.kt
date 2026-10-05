package com.inboxreborn.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SearchBar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.inboxreborn.app.model.Tab
import com.inboxreborn.app.model.ThreadItem
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    vm: InboxViewModel,
    onOpenBundle: (String) -> Unit,
    onSnooze: (Set<String>) -> Unit,
    onCompose: () -> Unit,
) {
    val state by vm.ui.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var searchOpen by remember { mutableStateOf(false) }

    state.pendingUndo?.let { undo ->
        LaunchedEffect(undo) {
            val r = snackbar.showSnackbar(undo.label, actionLabel = "UNDO")
            if (r == SnackbarResult.ActionPerformed) undo.restore()
            vm.consumeUndo()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inbox") },
                navigationIcon = {
                    IconButton(onClick = { /* drawer: tabs below cover Phase 1 */ }) {
                        Icon(Icons.Filled.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { vm.setPinnedOnly(!state.pinnedOnly) }) {
                        Icon(Icons.Filled.PushPin, contentDescription = "Pinned only",
                            tint = if (state.pinnedOnly) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { searchOpen = !searchOpen }) {
                        Icon(Icons.Filled.Search, contentDescription = "Search")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = onCompose, icon = {}, text = { Text("Compose") })
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (searchOpen) {
                SearchBar(
                    query = state.query,
                    onQueryChange = vm::setQuery,
                    onSearch = {},
                    active = false,
                    onActiveChange = {},
                    placeholder = { Text("Search mail, bundles, reminders…") },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                ) {}
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TabChip("Inbox", state.tab == Tab.INBOX) { vm.setTab(Tab.INBOX) }
                TabChip("Snoozed", state.tab == Tab.SNOOZED) { vm.setTab(Tab.SNOOZED) }
                TabChip("Done", state.tab == Tab.DONE) { vm.setTab(Tab.DONE) }
                TabChip("Reminders", state.tab == Tab.REMINDERS) { vm.setTab(Tab.REMINDERS) }
            }
            val items = vm.visibleThreads()
            if (items.isEmpty()) {
                Column(Modifier.fillMaxSize().padding(48.dp)) {
                    Text("Inbox Zero — enjoy the sunshine.",
                        style = MaterialTheme.typography.bodyLarge)
                }
            } else {
                LazyColumn(Modifier.fillMaxSize()) {
                    val (bundled, loose) = items.partition { it.bundleId != null && state.tab == Tab.INBOX }
                    val byBundle = bundled.groupBy { it.bundleId!! }
                    items(byBundle.entries.toList()) { (bid, ts) ->
                        val b = state.bundles.firstOrNull { it.id == bid }
                        Card(
                            Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)
                                .clickable { onOpenBundle(bid) },
                        ) {
                            ListItem(
                                headlineContent = { Text(b?.name ?: bid) },
                                supportingContent = {
                                    Text(ts.take(3).joinToString(" · ") { it.subject },
                                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                                },
                                trailingContent = {
                                    IconButton(onClick = { ts.forEach { vm.markDone(it.id) } }) {
                                        Icon(Icons.Filled.Check, contentDescription = "Sweep bundle")
                                    }
                                },
                            )
                        }
                    }
                    var lastDay: String? = null
                    loose.forEach { t ->
                        val day = dayLabel(t.timestampMillis)
                        if (state.tab == Tab.INBOX && day != lastDay) {
                            lastDay = day
                            item(key = "day-$day") {
                                Text(day, style = MaterialTheme.typography.labelLarge,
                                    modifier = Modifier.padding(start = 16.dp, top = 12.dp, bottom = 2.dp))
                            }
                        }
                        item(key = t.id) {
                            ThreadRow(
                                t = t,
                                showRestore = state.tab == Tab.DONE,
                                onDone = { vm.markDone(t.id) },
                                onRestore = { vm.restore(t.id) },
                                onPin = { vm.togglePin(t.id) },
                                onSnooze = { onSnooze(setOf(t.id)) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TabChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick, label = { Text(label) })
}

@Composable
fun ThreadRow(
    t: ThreadItem,
    showRestore: Boolean,
    onDone: () -> Unit,
    onRestore: () -> Unit,
    onPin: () -> Unit,
    onSnooze: () -> Unit,
) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)) {
        ListItem(
            headlineContent = { Text("${if (t.pinned) "📌 " else ""}${t.subject}") },
            supportingContent = {
                Column {
                    Text(t.snippet, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    t.assist?.let {
                        Text(it, color = MaterialTheme.colorScheme.tertiary,
                            style = MaterialTheme.typography.bodySmall)
                    }
                    if (t.isSnoozed) {
                        Text("Snoozed until ${fmtDateTime(t.snoozedUntil)}",
                            style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            leadingContent = {
                Text(
                    (if (t.kind == ThreadItem.Kind.REMINDER) "R" else t.from.ifBlank { "•" })
                        .first().toString(),
                    style = MaterialTheme.typography.titleMedium,
                )
            },
            trailingContent = {
                Row {
                    if (showRestore) {
                        IconButton(onClick = onRestore) { Text("↩") }
                    } else {
                        IconButton(onClick = onPin) {
                            Text(if (t.pinned) "★" else "☆")
                        }
                        IconButton(onClick = onSnooze) {
                            Icon(Icons.Filled.Schedule, contentDescription = "Snooze")
                        }
                        IconButton(onClick = onDone) {
                            Icon(Icons.Filled.Check, contentDescription = "Done")
                        }
                    }
                }
            },
        )
    }
}

fun dayLabel(millis: Long): String {
    val zone = ZoneId.systemDefault()
    val date = Instant.ofEpochMilli(millis).atZone(zone).toLocalDate()
    val today = LocalDate.now(zone)
    return when (date) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        else -> date.format(DateTimeFormatter.ofPattern("MMMM yyyy"))
    }
}

fun fmtDateTime(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault())
        .format(DateTimeFormatter.ofPattern("EEE, MMM d, h:mm a"))
