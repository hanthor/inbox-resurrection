package com.inboxreborn.app.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.LocalDateTime
import java.time.ZoneId

@Composable
fun BundleDetailScreen(vm: InboxViewModel, bundleId: String, onBack: () -> Unit) {
    val state by vm.ui.collectAsState()
    val bundle = state.bundles.firstOrNull { it.id == bundleId }
    val items = state.threads.filter { it.bundleId == bundleId && !it.done }
    Scaffold(
        topBar = {
            @OptIn(ExperimentalMaterial3Api::class)
            TopAppBar(
                title = { Text(bundle?.name ?: bundleId) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { vm.sweep(bundleId); onBack() }) { Text("Sweep") }
                },
            )
        },
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding)) {
            items(items, key = { it.id }) { t ->
                ThreadRow(t, showRestore = false,
                    onDone = { vm.markDone(t.id) }, onRestore = {},
                    onPin = { vm.togglePin(t.id) }, onSnooze = {})
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SnoozeSheet(ids: Set<String>, vm: InboxViewModel, onDone: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDone) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text("Snooze until…")
            LazyVerticalGrid(columns = GridCells.Fixed(3)) {
                items(SnoozePreset.entries) { preset ->
                    val fireAt = resolveSnooze(preset)
                    FilterChip(
                        selected = false,
                        onClick = {
                            val millis = fireAt.atZone(ZoneId.systemDefault())
                                .toInstant().toEpochMilli()
                            vm.snooze(ids, millis)
                            onDone()
                        },
                        label = { Text(preset.label) },
                        modifier = Modifier.padding(4.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun ReminderDialog(vm: InboxViewModel, onDone: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var whenPreset by remember { mutableStateOf(SnoozePreset.TOMORROW) }
    AlertDialog(
        onDismissRequest = onDone,
        title = { Text("New reminder") },
        text = {
            Column {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Remind me to…") },
                )
                LazyVerticalGrid(columns = GridCells.Fixed(3)) {
                    items(SnoozePreset.entries) { preset ->
                        FilterChip(
                            selected = preset == whenPreset,
                            onClick = { whenPreset = preset },
                            label = { Text(preset.label) },
                            modifier = Modifier.padding(4.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                vm.addReminder(title)
                // Reminders start in the inbox; time presets apply as follow-ups.
                onDone()
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDone) { Text("Cancel") } },
    )
}

fun LocalDateTime.toMillis(): Long = atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
