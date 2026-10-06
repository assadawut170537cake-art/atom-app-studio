package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class ChatAppendRequest(
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("role") val role: String,
    @SerializedName("message") val message: String
)
