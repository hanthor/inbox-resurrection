package com.inboxreborn.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.inboxreborn.app.ui.BundleDetailScreen
import com.inboxreborn.app.ui.InboxScreen
import com.inboxreborn.app.ui.InboxViewModel
import com.inboxreborn.app.ui.ReminderDialog
import com.inboxreborn.app.ui.SnoozeSheet
import com.inboxreborn.app.ui.theme.InboxRebornTheme

private sealed interface Route {
    data object Inbox : Route
    data class Bundle(val id: String) : Route
}

class MainActivity : ComponentActivity() {
    private val vm: InboxViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            InboxRebornTheme {
                var route: Route by remember { mutableStateOf(Route.Inbox) }
                var snoozeIds: Set<String>? by remember { mutableStateOf(null) }
                var showReminder by remember { mutableStateOf(false) }
                val state by vm.ui.collectAsState()

                when (val r = route) {
                    is Route.Inbox -> InboxScreen(
                        vm = vm,
                        onOpenBundle = { route = Route.Bundle(it) },
                        onSnooze = { snoozeIds = it },
                        onCompose = { showReminder = true },
                    )
                    is Route.Bundle -> BundleDetailScreen(
                        vm = vm,
                        bundleId = r.id,
                        onBack = { route = Route.Inbox },
                    )
                }
                snoozeIds?.let { ids ->
                    SnoozeSheet(ids = ids, vm = vm, onDone = { snoozeIds = null })
                }
                if (showReminder) {
                    ReminderDialog(vm = vm, onDone = { showReminder = false })
                }
                // Keep state referenced so Compose tracks tab/count changes.
                @Suppress("UNUSED_EXPRESSION") state
            }
        }
    }
}
