package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class ChatMessage(
    @SerializedName("id") val id: Int? = null,
    @SerializedName("session_id") val sessionId: String? = null,
    @SerializedName("role") val role: String = "",
    @SerializedName("message") val message: String = "",
    @SerializedName("created_at") val createdAt: String? = null
)
