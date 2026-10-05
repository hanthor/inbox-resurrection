package com.inboxreborn.app.data

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices

/** "Pick place" snooze: geofence arrival returns the thread to the inbox. */
object PlaceSnooze {
    const val RADIUS_M = 150f
    private const val PREFS = "inbox_places"

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

    fun perms(): Array<String> = arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
    )

    /** Capture current location, then [done] with (lat, lng) or null. */
    fun capture(context: Context, done: (Pair<Double, Double>?) -> Unit) {
        if (!hasPermission(context)) { done(null); return; }
        try {
            LocationServices.getFusedLocationProviderClient(context).lastLocation
                .addOnSuccessListener { loc ->
                    done(if (loc != null) Pair(loc.latitude, loc.longitude) else null)
                }
                .addOnFailureListener { done(null) }
        } catch (e: SecurityException) {
            done(null)
        }
    }

    /** Register an enter-geofence; arrival flags each thread id for MainActivity. */
    fun arm(context: Context, threadIds: Set<String>, lat: Double, lng: Double) {
        if (!hasPermission(context)) return
        val client = LocationServices.getGeofencingClient(context)
        val fences = threadIds.map { id ->
            Geofence.Builder()
                .setRequestId("inbox:$id")
                .setCircularRegion(lat, lng, RADIUS_M)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                .build()
        }
        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(fences)
            .build()
        val intent = Intent(context, PlaceReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
        try { client.addGeofences(request, pi) } catch (e: SecurityException) { /* no-op */ }
    }

    fun markArrived(context: Context, threadId: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("arrived:$threadId", true).apply()
    }

    /** Thread ids whose place fired since last check (flags cleared). */
    fun drainArrived(context: Context): Set<String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val out = prefs.all.keys
            .filter { it.startsWith("arrived:") && prefs.getBoolean(it, false) }
            .map { it.removePrefix("arrived:") }
            .toSet()
        if (out.isNotEmpty()) {
            prefs.edit().apply {
                out.forEach { remove("arrived:$it") }
            }.apply()
        }
        return out
    }

    /** Fired by the geofencing client on arrival. */
    class PlaceReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val event = com.google.android.gms.location.GeofencingEvent.fromIntent(intent)
                ?: return
            if (event.hasError()) return
            if (event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER) return
            event.triggeringGeofences?.forEach {
                markArrived(context, it.requestId.removePrefix("inbox:"))
            }
        }
    }
}
