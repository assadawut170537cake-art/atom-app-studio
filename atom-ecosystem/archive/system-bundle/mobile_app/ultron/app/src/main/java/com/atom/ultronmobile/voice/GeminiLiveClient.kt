package com.atom.ultronmobile.voice

import android.util.Base64
import com.atom.ultronmobile.BuildConfig
import com.atom.ultronmobile.data.ApiClient
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ลูกค้า Gemini Live API (BidiGenerateContent) ผ่าน WebSocket
 * - ส่ง audio 16k PCM จากไมค์เป็น realtimeInput.mediaChunks
 * - รับ audio 24k PCM จาก model เล่นผ่าน AudioPlayer (คลาสท้ายไฟล์)
 * ชื่อ model อาจเปลี่ยนตามรอบ release — แก้ผ่าน GEMINI_LIVE_MODEL ใน local.properties
 */
class GeminiLiveClient {

    interface Callback {
        fun onConnected()
        fun onAudioChunk(pcm24k: ByteArray)
        fun onUserText(text: String)
        fun onBotText(text: String)
        fun onFailure(t: Throwable)
        fun onClosedByServer()
    }

    companion object {
        private const val WS_BASE =
            "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
        const val MODEL_OUT_RATE = 24000
    }

    private val gson = Gson()
    private var socket: WebSocket? = null
    private val open = AtomicBoolean(false)
    private val player = AudioPlayer(MODEL_OUT_RATE)

    val isConnected: Boolean get() = open.get()

    fun connect(callback: Callback) {
        if (open.get()) return
        val url = "$WS_BASE?key=${BuildConfig.GEMINI_API_KEY}"
        val req = Request.Builder().url(url).build()
        socket = ApiClient.wsClient.newWebSocket(req, object : WebSocketListener() {

            override fun onOpen(ws: WebSocket, response: Response) {
                open.set(true)
                ws.send(gson.toJson(mapOf(
                    "setup" to mapOf(
                        "model" to "models/${BuildConfig.GEMINI_LIVE_MODEL}",
                        "generationConfig" to mapOf(
                            "responseModalities" to listOf("AUDIO"),
                            "speechConfig" to mapOf(
                                "voiceConfig" to mapOf(
                                    "prebuiltVoiceConfig" to mapOf("voiceName" to "Puck")
                                )
                            )
                        ),
                        "systemInstruction" to mapOf(
                            "parts" to listOf(mapOf(
                                "text" to "You are ULTRON, a concise Thai voice assistant on the boss's Android phone. Reply briefly."
                            ))
                        )
                    )
                )))
                callback.onConnected()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val msg = gson.fromJson(text, JsonObject::class.java)
                    val sc = msg.getAsJsonObject("serverContent") ?: return
                    sc.getAsJsonObject("inputTranscription")
                        ?.get("text")?.asString?.takeIf { it.isNotEmpty() }
                        ?.let(callback::onUserText)
                    sc.getAsJsonObject("outputTranscription")
                        ?.get("text")?.asString?.takeIf { it.isNotEmpty() }
                        ?.let(callback::onBotText)
                    sc.getAsJsonArray("modelContent")?.getAsJsonObject("parts")
                        ?.let { parts ->
                            for (p in parts) {
                                val po = p.asJsonObject
                                if (po.has("inlineData")) {
                                    val data = po.getAsJsonObject("inlineData")
                                        .get("data").asString
                                    val decoded = Base64.decode(data, Base64.DEFAULT)
                                    player.write(decoded)
                                    callback.onAudioChunk(decoded)
                                }
                            }
                        }
                } catch (t: Throwable) {
                    callback.onFailure(t)
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                open.set(false)
                callback.onFailure(t)
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                open.set(false)
                callback.onClosedByServer()
            }
        })
    }

    fun sendAudio(pcm16k: ByteArray) {
        val ws = socket ?: return
        if (!open.get()) return
        val b64 = Base64.encodeToString(pcm16k, Base64.NO_WRAP)
        ws.send(gson.toJson(mapOf(
            "realtimeInput" to mapOf(
                "mediaChunks" to listOf(mapOf(
                    "mimeType" to "audio/pcm;rate=16000",
                    "data" to b64
                ))
            )
        )))
    }

    fun disconnect() {
        player.stop()
        socket?.close(1000, "bye")
        socket = null
        open.set(false)
    }
}

/** เล่น PCM 24k mono 16-bit จาก Live API แบบ stream */
class AudioPlayer(private val sampleRate: Int) {
    private var track: android.media.AudioTrack? = null

    @Synchronized
    fun write(pcm: ByteArray) {
        if (track == null) {
            track = android.media.AudioTrack(
                android.media.AudioManager.STREAM_MUSIC,
                sampleRate,
                android.media.AudioFormat.CHANNEL_OUT_MONO,
                android.media.AudioFormat.ENCODING_PCM_16BIT,
                android.media.AudioTrack.getMinBufferSize(
                    sampleRate,
                    android.media.AudioFormat.CHANNEL_OUT_MONO,
                    android.media.AudioFormat.ENCODING_PCM_16BIT
                ),
                android.media.AudioTrack.MODE_STREAM
            ).apply { play() }
        }
        track?.write(pcm, 0, pcm.size)
    }

    @Synchronized
    fun stop() {
        try {
            track?.stop()
        } catch (_: IllegalStateException) {
        }
        track?.release()
        track = null
    }
}
