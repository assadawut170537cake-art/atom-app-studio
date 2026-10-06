package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class KillSwitchRequest(
    @SerializedName("requested_by") val requestedBy: String
)
