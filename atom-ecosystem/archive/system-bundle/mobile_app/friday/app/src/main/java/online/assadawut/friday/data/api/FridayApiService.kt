package online.assadawut.friday.data.api

import online.assadawut.friday.data.model.ChatAppendRequest
import online.assadawut.friday.data.model.ChatHistoryResponse
import online.assadawut.friday.data.model.EmergencyStatus
import online.assadawut.friday.data.model.HealthResponse
import online.assadawut.friday.data.model.HeartbeatRequest
import online.assadawut.friday.data.model.HeartbeatResponse
import online.assadawut.friday.data.model.KillSwitchRequest
import online.assadawut.friday.data.model.PresenceResponse
import online.assadawut.friday.data.model.QueueTask
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface FridayApiService {

    @GET("/health")
    suspend fun health(): Response<HealthResponse>

    @GET("/api/v1/queue/list")
    suspend fun getQueue(
        @Query("status") status: String? = null,
        @Query("limit") limit: Int = 50
    ): Response<Map<String, List<QueueTask>>>

    @POST("/api/v1/sync/chat/append")
    suspend fun appendChat(@Body request: ChatAppendRequest): Response<Unit>

    @GET("/api/v1/sync/chat/history")
    suspend fun getChatHistory(
        @Query("session_id") sessionId: String = "friday-mobile",
        @Query("limit") limit: Int = 50
    ): Response<ChatHistoryResponse>

    @GET("/api/v1/knowledge/query")
    suspend fun queryKnowledge(
        @Query("q") q: String
    ): Response<Map<String, Any>>

    @GET("/presence/status")
    suspend fun getPresence(): Response<PresenceResponse>

    @POST("/presence/heartbeat")
    suspend fun heartbeat(@Body request: HeartbeatRequest): Response<HeartbeatResponse>

    @POST("/emergency/kill-switch")
    suspend fun killSwitch(@Body request: KillSwitchRequest): Response<EmergencyStatus>

    @POST("/emergency/resume")
    suspend fun resumeSystem(@Body request: KillSwitchRequest): Response<EmergencyStatus>

    @GET("/emergency/status")
    suspend fun getEmergencyStatus(): Response<EmergencyStatus>
}
