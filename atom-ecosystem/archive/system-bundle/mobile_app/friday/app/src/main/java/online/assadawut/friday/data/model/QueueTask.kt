package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class QueueTask(
    @SerializedName("task_id") val taskId: String,
    @SerializedName("task_type") val taskType: String,
    @SerializedName("status") val status: String,
    @SerializedName("payload") val payload: Map<String, Any>? = null
)
