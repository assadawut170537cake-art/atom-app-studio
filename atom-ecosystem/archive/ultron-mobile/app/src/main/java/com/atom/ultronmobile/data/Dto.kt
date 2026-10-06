package com.atom.ultronmobile.data

import com.google.gson.annotations.SerializedName

/** POST /presence/heartbeat — body เดียวกันกับ PC Worker (Phase 6) */
data class HeartbeatRequest(
    @SerializedName("node_id") val nodeId: String,
    @SerializedName("metadata") val metadata: Map<String, String>
)

/** GET /presence — รายชือ node ทังหมดที่ VPS เห็น */
data class PresenceResponse(
    @SerializedName("nodes") val nodes: List<PresenceNode> = emptyList()
)

data class PresenceNode(
    @SerializedName("node_id") val nodeId: String = "?",
    @SerializedName("status") val status: String = "unknown",
    @SerializedName("last_seen") val lastSeen: String = "",
    @SerializedName("metadata") val metadata: Map<String, String> = emptyMap()
)

/** POST /api/v1/system/kill-switch */
data class KillSwitchRequest(
    @SerializedName("requested_by") val requestedBy: String
)

data class KillSwitchResponse(
    @SerializedName("ok") val ok: Boolean = false,
    @SerializedName("message") val message: String = ""
)
