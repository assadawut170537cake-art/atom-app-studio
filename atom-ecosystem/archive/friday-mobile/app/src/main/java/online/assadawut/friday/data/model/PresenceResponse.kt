package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class PresenceResponse(
    @SerializedName("nodes")
    val nodes: Map<String, PresenceNode> = emptyMap()
)

data class PresenceNode(
    @SerializedName("status") val status: String? = null,
    @SerializedName("last_seen") val lastSeen: String? = null,
    @SerializedName("metadata") val metadata: Map<String, Any>? = null
)
