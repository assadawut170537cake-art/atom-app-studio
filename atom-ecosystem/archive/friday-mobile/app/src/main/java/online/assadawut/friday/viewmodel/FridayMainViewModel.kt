package online.assadawut.friday.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.google.gson.JsonArray
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import online.assadawut.friday.BuildConfig
import online.assadawut.friday.data.api.AtomApiClient
import online.assadawut.friday.data.api.GeminiApiService
import online.assadawut.friday.data.api.GeminiContent
import online.assadawut.friday.data.api.GeminiPart
import online.assadawut.friday.data.api.GeminiRequest
import online.assadawut.friday.data.api.GeminiSystemInstruction
import online.assadawut.friday.data.local.FridayDatabase
import online.assadawut.friday.data.local.SpecEntity
import online.assadawut.friday.data.model.ChatAppendRequest
import online.assadawut.friday.data.model.ChatMessage
import online.assadawut.friday.data.model.HeartbeatRequest
import online.assadawut.friday.data.model.KillSwitchRequest
import online.assadawut.friday.data.model.PresenceResponse
import online.assadawut.friday.data.model.QueueTask
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class FridayMainViewModel(application: Application) : AndroidViewModel(application) {

    private val api = AtomApiClient.api

    private val geminiApi = Retrofit.Builder()
        .baseUrl("https://generativelanguage.googleapis.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(GeminiApiService::class.java)

    private val specDao = FridayDatabase.get(application).specDao()

    private val personaPrompt = """
        You are FRIDAY - orchestrator for Assadawut.
        Persona:
        - Female voice, polite
        - Thai polite particles: kha / na kha (Thai particles)
        - Organized, structured, helpful
        Role:
        - Workspace organization
        - Documents and tables
        - Prose spec writing
        - TDD spec writing
        - Curation
        Tone: polite, clear, gentle.
        Respond in Thai.
        Max 3-5 sentences per reply.
    """.trimIndent()

    private val _presence = MutableStateFlow<PresenceResponse?>(null)
    val presence: StateFlow<PresenceResponse?> = _presence.asStateFlow()

    private val _tasks = MutableStateFlow<List<QueueTask>>(emptyList())
    val tasks: StateFlow<List<QueueTask>> = _tasks.asStateFlow()

    private val _chat = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chat: StateFlow<List<ChatMessage>> = _chat.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _importProgress = MutableStateFlow(0)
    val importProgress: StateFlow<Int> = _importProgress.asStateFlow()

    val specs = specDao.observeAll()

    private var heartbeatJob: Job? = null

    fun clearError() {
        _error.value = null
    }

    fun refreshPresence() {
        viewModelScope.launch {
            try {
                val response = api.getPresence()
                if (response.isSuccessful) {
                    _presence.value = response.body()
                } else if (response.code() == 401) {
                    _error.value = "Secret ผິด — ตรวจการตั้ งค่่าค่ะ"
                } else {
                    _error.value = "เชื่ อมต่อ VPS ไม้ได้ค่ะ"
                }
            } catch (_: Exception) {
                _error.value = "เชื่ อมต่อ VPS ไม้ได้ค่ะ"
            }
        }
    }

    fun refreshQueue() {
        viewModelScope.launch {
            try {
                val response = api.getQueue()
                if (response.isSuccessful) {
                    _tasks.value = response.body()?.get("tasks") ?: emptyList()
                }
            } catch (_: Exception) {
            }
        }
    }

    fun loadChatHistory() {
        viewModelScope.launch {
            try {
                val response = api.getChatHistory("friday-mobile", 50)
                if (response.isSuccessful) {
                    _chat.value = response.body()?.history?.reversed() ?: emptyList()
                }
            } catch (_: Exception) {
            }
        }
    }

    fun sendChatMessage(text: String) {
        if (text.isBlank()) return
        viewModelScope.launch {
            val userMessage = ChatMessage(role = "user", message = text)
            _chat.value = _chat.value + userMessage
            try {
                val contents = _chat.value.takeLast(10).map {
                    GeminiContent(
                        role = if (it.role == "assistant") "model" else "user",
                        parts = listOf(GeminiPart(it.message))
                    )
                }
                val result = geminiApi.generateContent(
                    "v1beta/models/gemini-2.5-flash:generateContent?key=${BuildConfig.GEMINI_API_KEY}",
                    GeminiRequest(
                        systemInstruction = GeminiSystemInstruction(
                            listOf(GeminiPart(personaPrompt))
                        ),
                        contents = contents
                    )
                )
                val answer = result.body()?.candidates?.firstOrNull()?.content
                    ?.parts?.firstOrNull()?.text ?: "AI ตอบไม้ได้ค่ะ"
                _chat.value = _chat.value + ChatMessage(role = "assistant", message = answer)
                api.appendChat(ChatAppendRequest("friday-mobile", "user", text))
                api.appendChat(ChatAppendRequest("friday-mobile", "assistant", answer))
            } catch (_: Exception) {
                _chat.value = _chat.value +
                    ChatMessage(role = "system", message = "AI ตอบไม้ได้ — ลองใหม้ นะคะ")
            }
        }
    }

    // ===== Spec CRUD =====
    fun saveSpec(id: Long?, title: String, content: String) {
        viewModelScope.launch {
            if (id == null || id == 0L) {
                specDao.insert(SpecEntity(title = title, content = content))
            } else {
                val existing = specDao.getById(id) ?: return@launch
                specDao.update(
                    existing.copy(
                        title = title,
                        content = content,
                        updatedAt = System.currentTimeMillis(),
                        synced = false
                    )
                )
            }
        }
    }

    fun deleteSpec(spec: SpecEntity) {
        viewModelScope.launch {
            specDao.delete(spec)
        }
    }

    // ===== Import Gemini History =====
    fun importGeminiHistory(rawJson: String) {
        viewModelScope.launch {
            try {
                val array: JsonArray = Gson().fromJson(rawJson, JsonArray::class.java)
                _importProgress.value = 0
                val total = array.size()
                var done = 0
                for (i in 0 until total) {
                    val obj = array.get(i).asJsonObject
                    val role = obj.get("role")?.asString ?: continue
                    val parts = obj.getAsJsonArray("parts") ?: continue
                    val text = parts.firstOrNull()?.asJsonObject?.get("text")?.asString
                        ?: continue
                    val mappedRole = when (role) {
                        "model" -> "assistant"
                        "user" -> "user"
                        else -> role
                    }
                    withContext(Dispatchers.IO) {
                        api.appendChat(ChatAppendRequest("friday-mobile", mappedRole, text))
                    }
                    done++
                    _importProgress.value = (done * 100) / total.coerceAtLeast(1)
                    delay(50)
                }
                loadChatHistory()
            } catch (_: Exception) {
                _error.value = "นำเข้้าไม้สําเร้็จค่ะ — ตรวจ JSON"
            }
        }
    }

    // ===== System =====
    fun triggerKillSwitch() {
        viewModelScope.launch {
            try {
                api.killSwitch(KillSwitchRequest("friday-mobile"))
            } catch (_: Exception) {
            }
        }
    }

    fun resumeSystem() {
        viewModelScope.launch {
            try {
                api.resumeSystem(KillSwitchRequest("friday-mobile"))
            } catch (_: Exception) {
            }
        }
    }

    fun startHeartbeat() {
        if (heartbeatJob != null) return
        heartbeatJob = viewModelScope.launch {
            while (true) {
                try {
                    api.heartbeat(
                        HeartbeatRequest(
                            "MOBILE_S10",
                            mapOf("os" to "android", "app" to "friday")
                        )
                    )
                } catch (_: Exception) {
                }
                delay(20_000)
            }
        }
    }

    fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    override fun onCleared() {
        super.onCleared()
        stopHeartbeat()
    }
}
