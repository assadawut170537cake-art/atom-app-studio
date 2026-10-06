package online.assadawut.friday.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Url

interface GeminiApiService {

    @POST
    suspend fun generateContent(
        @Url url: String,
        @Body request: GeminiRequest
    ): Response<GeminiResponse>
}

data class GeminiRequest(
    @SerializedName("systemInstruction") val systemInstruction: GeminiSystemInstruction,
    @SerializedName("contents") val contents: List<GeminiContent>
)

data class GeminiSystemInstruction(
    @SerializedName("parts") val parts: List<GeminiPart>
)

data class GeminiContent(
    @SerializedName("role") val role: String,
    @SerializedName("parts") val parts: List<GeminiPart>
)

data class GeminiPart(
    @SerializedName("text") val text: String
)

data class GeminiResponse(
    @SerializedName("candidates") val candidates: List<GeminiCandidate>?
)

data class GeminiCandidate(
    @SerializedName("content") val content: GeminiContent?
)
