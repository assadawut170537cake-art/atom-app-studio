package com.atom.ultronmobile

import android.annotation.SuppressLint
import android.app.Application
import android.os.Build
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.atom.ultronmobile.data.ApiClient
import com.atom.ultronmobile.data.HeartbeatRequest
import com.atom.ultronmobile.data.KillSwitchRequest
import com.atom.ultronmobile.data.PresenceNode
import com.atom.ultronmobile.orb.OrbState
import com.atom.ultronmobile.voice.AudioRecorder
import com.atom.ultronmobile.voice.GeminiLiveClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

/**
 * สมองของ ULTRON Mobile (Phase 7)
 * รวมสวนทีกูคืนจาก fragment เดิม: triggerKillSwitch / startHeartbeat /
 * stopHeartbeat / sendHeartbeat / startListening — และเติมสวนที่ขาด (หัว [A], ทาย [B])
 */
class AtomViewModel(app: Application) : AndroidViewModel(app) {

    companion object {
        private const val HEARTBEAT_MS = 20_000L
    }

    private val api = ApiClient.api
    private val recorder = AudioRecorder()
    private val gemini = GeminiLiveClient()
    private val listening = AtomicBoolean(false)
    private var heartbeatJob: Job? = null

    private val _orbState = MutableStateFlow(OrbState.IDLE)
    val orbState: StateFlow<OrbState> = _orbState.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _nodes = MutableStateFlow<List<PresenceNode>>(emptyList())
    val nodes: StateFlow<List<PresenceNode>> = _nodes.asStateFlow()

    private val _online = MutableStateFlow(false)
    val online: StateFlow<Boolean> = _online.asStateFlow()

    private val _transcript = MutableStateFlow("")
    val transcript: StateFlow<String> = _transcript.asStateFlow()

    init {
        startHeartbeat()
    }

    // ---- Presence / Heartbeat ------------------------------------------------

    fun startHeartbeat() {
        if (heartbeatJob?.isActive == true) return
        heartbeatJob = viewModelScope.launch {
            while (isActive) {
                sendHeartbeat()
                refreshPresence()
                delay(HEARTBEAT_MS)
            }
        }
    }

    fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    private suspend fun sendHeartbeat() {
        try {
            api.heartbeat(
                HeartbeatRequest(
                    nodeId = BuildConfig.NODE_ID,
                    metadata = mapOf(
                        "os" to "android",
                        "app" to "atom",
                        "device" to Build.MODEL
                    )
                )
            )
            _online.value = true
        } catch (_: Exception) {
            // เงียบไวตามตนฉบับ — heartbeat หลุดไมขึ้น error ใหผใช
            _online.value = false
        }
    }

    private fun refreshPresence() {
        viewModelScope.launch {
            try {
                val body = api.presence().body()
                if (body != null) {
                    _nodes.value = body.nodes
                    _online.value = true
                } else {
                    _online.value = false
                }
            } catch (_: Exception) {
                _online.value = false
            }
        }
    }

    // ---- Kill Switch ---------------------------------------------------------

    @SuppressLint("HardwareIds")
    fun triggerKillSwitch() {
        viewModelScope.launch {
            try {
                val androidId = Settings.Secure.getString(
                    getApplication<Application>().contentResolver,
                    Settings.Secure.ANDROID_ID
                )
                val response = api.triggerKillSwitch(
                    KillSwitchRequest(requestedBy = androidId ?: BuildConfig.NODE_ID)
                )
                if (response.isSuccessful) {
                    _orbState.value = OrbState.ALERT
                    refreshPresence()
                } else if (response.code() == 401) {
                    _error.value = "Secret ผิดพลาด — ตรวจการตั้งคา"
                } else {
                    _error.value = "VPS ตอบกลับผิดปกติ (${response.code()})"
                }
            } catch (_: Exception) {
                _error.value = "เชอมตอ VPS ไมได"
            }
        }
    }

    // ---- Voice (Gemini Live) ---------------------------------------------------

    fun startListening() {
        if (listening.get()) return
        if (BuildConfig.GEMINI_API_KEY.isBlank()) {
            _error.value = "Gemini API Key ยังไมไดตั้งคา (local.properties)"
            return
        }
        val started = recorder.start { pcm -> gemini.sendAudio(pcm) }
        if (!started) {
            _error.value = "ไมสามารถเปดไมโครโฟนได (ตรวจ permission)"
            return
        }
        listening.set(true)
        _transcript.value = ""
        _orbState.value = OrbState.LISTENING
        gemini.connect(object : GeminiLiveClient.Callback {
            override fun onConnected() = Unit

            override fun onAudioChunk(pcm24k: ByteArray) {
                // AudioPlayer ภายใน client เลนเอง — สถานะเทานี้ที่ตองขยับ
                _orbState.value = OrbState.SPEAKING
            }

            override fun onUserText(text: String) {
                _transcript.value = "คุณ: $text"
            }

            override fun onBotText(text: String) {
                _transcript.value = "ULTRON: $text"
            }

            override fun onFailure(t: Throwable) {
                stopListening("เสียงขาดผวน — เชอมตอ Gemini ไมได")
            }

            override fun onClosedByServer() {
                stopListening(null)
            }
        })
    }

    fun stopListening(userMessage: String? = null) {
        if (!listening.compareAndSet(true, false)) return
        recorder.stop()
        gemini.disconnect()
        _orbState.value = if (userMessage != null) OrbState.ALERT else OrbState.IDLE
        if (userMessage != null) _error.value = userMessage
    }

    fun toggleListening() {
        if (listening.get()) stopListening() else startListening()
    }

    fun consumeError() {
        _error.value = null
        if (_orbState.value == OrbState.ALERT) _orbState.value = OrbState.IDLE
    }

    override fun onCleared() {
        super.onCleared()
        stopHeartbeat()
        stopListening()
    }
}
