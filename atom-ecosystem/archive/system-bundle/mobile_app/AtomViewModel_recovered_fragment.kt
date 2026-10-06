// ============================================================================
// RECOVERED FRAGMENT — ATOM Mobile ViewModel (บางส่วน)
// ต้นทาง: paste จากเอกสาร (token แตกบรรทัด + วรรณยุกต์ไทยซ้ำใน string)
//
// สถานะ: เป็น FRAGMENT เท่านั้น — ห้าม compile เดี่ยว ๆ
//   [A] หัวขาด: โครง function ครอบ kill-switch ไม่มาใน paste
//       สันนิษฐาน: fun triggerKillSwitch() { viewModelScope.launch { ... } }
//   [B] ท้ายขาด: คัตอยู่กลาง object : GeminiLiveClient.Callback {
//
// สิ่งที่แก้จากการกู้คืน:
//   1. รวม token ที่แตกบรรทัดกลับเป็น Kotlin ปกติ
//   2. แก้ string ไทยที่วรรณยุกต์ซ้ำ:
//      "Secret ผิ ผิด — ตรวจการตั้ ตั้ งค่ ค่า"  -> "Secret ผิดพลาด — ตรวจการตั้ งค่า"
//      (ดูคำเต็มที่แก้แล้วในแต่ละบรรทัด _error.value)
// ============================================================================

// --- [A] หัวขาด — โครงนี้เป็นการสันนิษฐาน ให้เทียบกับเอกสารต้นฉบับ ---
fun triggerKillSwitch() {
    viewModelScope.launch {
        try {
            val androidId = Settings.Secure.getString(
                getApplication<Application>().contentResolver,
                Settings.Secure.ANDROID_ID
            )
            val response = api.triggerKillSwitch(
                KillSwitchRequest(
                    requestedBy = androidId ?: "MOBILE_S10"
                )
            )
            if (response.isSuccessful) {
                refreshPresence()
            } else if (response.code() == 401) {
                _error.value = "Secret ผิดพลาด — ตรวจการตั้งค่า"
            } else {
                _error.value = "เชื่อมต่อ VPS ไม่ได้"
            }
        } catch (_: Exception) {
            _error.value = "เชื่อมต่อ VPS ไม่ได้"
        }
    }
}

fun startHeartbeat() {
    if (heartbeatJob?.isActive == true) return
    heartbeatJob = viewModelScope.launch {
        while (isActive) {
            sendHeartbeat()
            delay(20_000)
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
                nodeId = "MOBILE_S10",
                metadata = mapOf("os" to "android", "app" to "atom")
            )
        )
    } catch (_: Exception) {
        // เงียบไว้ตามต้นฉบับ — heartbeat หลุดไม่ขึ้น error ให้ผู้ใช้
    }
}

fun startListening() {
    if (listening.get()) return
    if (BuildConfig.GEMINI_API_KEY.isBlank()) {
        _error.value = "Gemini API Key ยังไม่ได้ตั้งค่า"
        return
    }
    val started = recorder.start()
    if (!started) {
        _error.value = "ไม่สามารถเปิดไมโครโฟนได้"
        return
    }
    listening.set(true)
    _orbState.value = OrbState.LISTENING
    gemini.connect(object : GeminiLiveClient.Callback {
        // --- [B] ท้ายขาด — ตัว Callback ไม่มาใน paste ให้แนบส่วนถัดไป ---
