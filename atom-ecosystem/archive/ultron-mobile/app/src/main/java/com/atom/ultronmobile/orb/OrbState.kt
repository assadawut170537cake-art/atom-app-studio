package com.atom.ultronmobile.orb

/** วงวน ORB = สถานะจิตวิญญาณของ ULTRON บนหน้าจอ */
enum class OrbState {
    IDLE,        // คอย — heartbeat ทำงานอยู่
    LISTENING,   // กำลังฟังผาน Gemini Live
    THINKING,    // รอ model ตอบ
    SPEAKING,    // กำลังตอบ (เลน็ audio ออกลำโพ)
    ALERT        // ตัดการเชื่ อมต่อ / kill-switch ทำงาน
}
