package online.assadawut.friday.data.model

import com.google.gson.annotations.SerializedName

data class ChatHistoryResponse(
    @SerializedName("history")
    val history: List<ChatMessage> = emptyList()
)
