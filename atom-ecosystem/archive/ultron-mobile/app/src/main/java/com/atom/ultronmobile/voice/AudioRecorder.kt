package com.atom.ultronmobile.voice

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlin.concurrent.thread
import java.util.concurrent.atomic.AtomicBoolean

/**
 * สแกน PCM 16kHz mono 16-bit จากไมโครโฟน
 * สง่ ต่อบัฟเฟอรร์ผาน onChunk (ใชป้ ้อน Gemini Live realtime input)
 */
class AudioRecorder {

    companion object {
        const val SAMPLE_RATE = 16000
        private const val BUFFER_SAMPLES = SAMPLE_RATE / 2 // 0.5s ต่อบัฟเฟอรร์
    }

    private var recorder: AudioRecord? = null
    private val running = AtomicBoolean(false)

    /** คืนค่า false ถ้าเปิดไมค์ไมได้ (เช่นยังไมได้รบั permission) */
    @Suppress("MissingPermission")
    fun start(onChunk: (ByteArray) -> Unit): Boolean {
        if (running.get()) return true
        val minBuf = AudioRecord.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        if (minBuf <= 0) return false
        val ar = try {
            AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
                maxOf(minBuf, BUFFER_SAMPLES * 2)
            )
        } catch (_: SecurityException) {
            return false
        }
        if (ar.state != AudioRecord.STATE_INITIALIZED) {
            ar.release()
            return false
        }

        recorder = ar
        running.set(true)
        ar.startRecording()

        thread(name = "atom-mic") {
            val buf = ByteArray(BUFFER_SAMPLES * 2)
            while (running.get()) {
                val n = ar.read(buf, 0, buf.size)
                if (n > 0) onChunk(buf.copyOf(n))
            }
        }
        return true
    }

    fun stop() {
        running.set(false)
        try {
            recorder?.stop()
        } catch (_: IllegalStateException) {
        }
        recorder?.release()
        recorder = null
    }
}
