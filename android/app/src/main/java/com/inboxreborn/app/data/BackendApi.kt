package com.inboxreborn.app.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class ThreadDto(
    val id: String,
    val from: String = "",
    val subject: String = "",
    val snippet: String = "",
)

data class ReminderDto(
    val id: String,
    val subject: String = "",
    val snippet: String = "",
    val done: Boolean = false,
    val dueAt: Long = 0,
)

data class ThreadsResponse(val threads: List<ThreadDto> = emptyList())
data class RemindersResponse(val reminders: List<ReminderDto> = emptyList())
data class IdBody(val id: String)
data class PinBody(val id: String, val pinned: Boolean)
data class SnoozeBody(val id: String, val fireAt: Long)
data class ReminderBody(val title: String, val notes: String = "", val dueAt: Long = 0)

/** Mirrors backend/src/index.mjs routes. */
interface BackendApi {
    @GET("/api/threads")
    suspend fun threads(@Header("Authorization") auth: String): ThreadsResponse

    @GET("/api/reminders")
    suspend fun reminders(@Header("Authorization") auth: String): RemindersResponse

    @POST("/api/done")
    suspend fun done(@Header("Authorization") auth: String, @Body body: IdBody)

    @POST("/api/pin")
    suspend fun pin(@Header("Authorization") auth: String, @Body body: PinBody)

    @POST("/api/snooze")
    suspend fun snooze(@Header("Authorization") auth: String, @Body body: SnoozeBody)

    @POST("/api/reminders")
    suspend fun addReminder(
        @Header("Authorization") auth: String,
        @Body body: ReminderBody,
    ): Map<String, ReminderDto>
}

object BackendClient {
    fun api(baseUrl: String): BackendApi = Retrofit.Builder()
        .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(BackendApi::class.java)
}
