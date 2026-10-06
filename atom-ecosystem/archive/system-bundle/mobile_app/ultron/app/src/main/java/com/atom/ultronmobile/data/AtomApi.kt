package com.atom.ultronmobile.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AtomApi {

    @GET("health")
    suspend fun health(): Response<Map<String, String>>

    @GET("presence")
    suspend fun presence(): Response<PresenceResponse>

    @POST("presence/heartbeat")
    suspend fun heartbeat(@Body body: HeartbeatRequest): Response<Map<String, String>>

    @POST("api/v1/system/kill-switch")
    suspend fun triggerKillSwitch(@Body body: KillSwitchRequest): Response<KillSwitchResponse>
}
