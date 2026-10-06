package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class EmergencyStatus(
    @SerializedName("kill_switch_active") val killSwitchActive: Boolean = false,
    @SerializedName("since") val since: String? = null
)
