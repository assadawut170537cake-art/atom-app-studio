package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class HeartbeatRequest(
    @SerializedName("node_id") val nodeId: String,
    @SerializedName("metadata") val metadata: Map<String, String>
)
