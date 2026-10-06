# PROJECT STRUCTURE & ARCHITECTURE — A.T.O.M. ECOSYSTEM

**ชื่อโปรเจกต์:** A.T.O.M. (Autonomous Transcendence Operations Matrix)
**สถานะระบบ:** Era 7 — Hybrid Cloud-First 24/7 + Local Workstation (J:\) + Mobile Edge (S10+)

---

## 📁 โครงสร้างไดเรกทอรีหลัก (Directory Layout)

```text
J:\โปรเจคอะตอม/
├── apps/                          # แอปพลิเคชันฝั่งผู้ใช้ (Execution Surfaces)
│   ├── kotlin/                    # Native Android (online.assadawut.atom)
│   │   └── atom_mobile/           # Clean Architecture Compose App (Gemini Live + Hybrid Pipeline)
│   ├── flutter/                   # Cross-Platform Mobile/Desktop App (com.atom.atom_app)
│   └── jarvis-clone/              # Electron Desktop App reference
├── services/                      # เซิร์ฟเวอร์หลักและบริการเบื้องหลัง
│   └── core/                      # Cloud VPS / Python Core Services (/opt/atom-core)
│       └── bub/                   # Bub Agent Runtime Framework & Skill Discovery Engine
├── workers/                       # PC Workstation Workers
│   └── pc/                        # ULTRON Heavy Coder Daemon / Ollama Execution Worker
├── integrations/                  # ส่วนต่อประสานและ Gateway
│   └── hermes/                    # Hermes / Ollama Bridge Gateway
├── config/                        # คอนฟิกและการจัดเก็บ Agent Personas
│   └── personas-legacy/           # agents/ (atom.md, friday.md, ultron.md)
├── tools/                         # สคริปต์ยูทิลิตีและเครื่องมือระบบ
│   └── platform-tools/            # Android Platform Tools (adb.exe, fastboot.exe)
├── docs/                          # เอกสารสถาปัตยกรรมและพิมพ์เขียวระบบ
│   └── ATOM_BLUEPRINT.md          # A.T.O.M. Master Blueprint & Tri-Core Manifesto
└── .agents/                       # Agent Skills Repository (มาตรฐาน agentskills.io)
    └── skills/                    # Custom & Bundled Skills (roll-dice, solana, flash-attention)
```

---

## 🏛️ สถาปัตยกรรมหลัก (System Architecture)

### 1. Tri-Core Titan Identity
- **A.T.O.M. (Dynamic Front):** Orb สีฟ้าคราม, คุยเสียงสดเรียลไทม์ (Gemini Live API WebSocket), กวนตีนเหน็บแนม แต่มุ่งมั่น 100%
- **F.R.I.D.A.Y. (Orchestrator):** Orb สีเขียวมรกต, สมองสถาปัตย์, สุภาพ นิ่ง มืออาชีพ, คุม Workspace และระบบเตือนภัยยุทธการ (God's Eye Tactical)
- **U.L.T.R.O.N. (Heavy Coder):** Orb สีแดงเพลิง, ดุดัน ไร้หางเสียง, ทำงานใน Sandbox กักกัน ปลดล็อกด้วย Master Key

### 2. Hybrid Pipeline (4-Step Execution Flow)
- **Step 1 (Input & Fast Routing):** แยกคำสั่ง Direct Action (สั่งอุปกรณ์) ออกจาก Memory Search
- **Step 2 (Direct Short-Circuit):** ตัดวงจรส่งคำสั่งไปยัง Device Handler ทันที (0 บาท / Zero Latency)
- **Step 3 (Vector Retrieval):** ค้นหาความจำผ่าน Cosine Similarity Search (SQLite-vec / Cloudflare Vectorize)
- **Step 4 (Decision Synthesis):** กรองคะแนนความมั่นใจ >= 0.65 และสร้างคำตอบด้วย LLM
- **Fail-Safe:** สลับกลับมาเป็น Local-First อัตโนมัติเมื่อ Cloud ขัดข้อง

### 3. God's Eye Tactical Recon (Geospatial & Traffic D)
- **พิกัดหลัก:** ศูนย์บัญชาการสมุทรปราการ (เทพารักษ์)
- **รัศมีเรดาร์:** สแกน 5.0 กม. รอบตัว
- **Night Checkpoint Alerts:** ดึงข้อมูลสตรีม Traffic D แจ้งเตือนด่านตรวจยามค่ำคืนด้วยเสียงผ่าน F.R.I.D.A.Y. ในระยะ 500 เมตร
