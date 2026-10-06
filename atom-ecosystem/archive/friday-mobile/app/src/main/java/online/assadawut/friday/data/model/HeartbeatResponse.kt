package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class HeartbeatResponse(
    @SerializedName("status") val status: String? = null,
    @SerializedName("node_id") val nodeId: String? = null
)
