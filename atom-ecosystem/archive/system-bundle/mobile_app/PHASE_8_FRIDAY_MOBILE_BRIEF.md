# PHASE 8 BRIEF — FRIDAY Mobile (ส่งต่อให้ Friday implement)

## หลักการ
**อย่าเขียนใหม่ — fork จาก ULTRON Mobile (Phase 7)** ซึ่่งอยู่ที่ `J:\ATOM_ULTRON_MOBILE\`
(22 ไฟล์, build ผ่าน Android Studio, contract ตรงกับ Core v6.0 + PC Worker Phase 6)
FRIDAY Mobile = เดียวกัน ~90% เปลี่ยนเฉพาะ "ตัวตน" กับ "พฤติกรรมเสียง"

## สิ่งที่ต้องเปลี่ยน (delta list)

| # | ตำแหน่ง | ULTRON (Phase 7) | FRIDAY (Phase 8) |
|---|---|---|---|
| 1 | `applicationId` / namespace | `com.atom.ultronmobile` | `com.atom.fridaymobile` |
| 2 | `NODE_ID` (local.properties) | `MOBILE_S10` | `MOBILE_PI4` (หรือเครื่องที่ใช้งานจริง) |
| 3 | `app_name` (strings.xml) | ULTRON Mobile | FRIDAY Mobile |
| 4 | systemInstruction ใน `GeminiLiveClient.onOpen` | "You are ULTRON, concise..." | "You are FRIDAY — สุภาพ อบอุ่น จำบริบทของบอสได้ ตอบสั้นพอ ฟังไทย/อังกฤษปนกัน (Tom/Risa style)" |
| 5 | voice name | `Puck` | `Kore` (หญิง/นุ่ม) — รายการ voice เปลี่ยนตาม release ให้ดู docs |
| 6 | สีสORB (`orb/Orb.kt`) | ฟ้า #39C0FF | ชมพู/ม่วง #FF6CBE เป็้นตัวแทน FRIDAY |
| 7 | KILL SWITCH button | มี (2-step confirm) | **เอาออก** — FRIDAY เป็น assistant ไม่ใช่ node สั่งหยุดระบบ; เก็บ presence+voice อย่างเดียว |

## สิ่งที่ใช้ต่อได้เลย (ไม่ต้องแตะ)
- Data layer ทั้งหมด (`Dto`, `AtomApi`, `ApiClient`) — snake_case + `X-Atom-Secret` เหมือนเดิม
- Heartbeat 20s + presence dashboard, AudioRecorder, AudioPlayer, permission flow
- การ degrade ตอน VPS ล่ม (OFFLINE + retry เงียบๆ)

## Dependencies ไปยัง Phase 3 (บน VPS — ยังไม่ deploy)
FRIDAY Mobile จะทำงานเต็มต่อเมื่อ Core มี:
- `GET /presence`, `POST /presence/heartbeat` (ตรง schema กับ PC Worker)
- **ใหม่สำหรับ Phase 8**: `POST /api/v1/friday/memory` — optional, body `{node_id, turn:{user,bot}, ts}`
  ให้ FRIDAY เก็บ transcript เข้า GDrive vault (gdrive_vault.py มี基础的อยู่แล้ว)
  ถ้ายังไม่มี endpoint → app ทำงานปกติ แค่ไม่บันทึกความจำ (fire-and-forget, try/c เงียบ)

## Definition of Done (Phase 8)
1. APK ติดตั้งบนเครื่องที่ 2 ได้ โดย presence ขึ้น 2 nodes พร้อมกันบน VPS
2. คุยเสียงไทยแล้ว latency ต่ำกว่า ~1.5s (Live API native audio)
3. ไม่มี KILL SWITCH ใน UI ของ FRIDAY เด็ดขาด (กันบอสกดผิดจากเครื่อง assistant)
4. secret ไม่อยู่ใน git — ตรวจ `git log -p | grep ATOM_SECRET` = ว่าง

## งานย่อยที่ค้างรวมของ mobile (ทุกเฟส)
- foreground service ให้ voice/background heartbeat ทำงานหลังล็อกจอ
- ย้าย Gemini key ออกจาก BuildConfig → ขอจาก `/voice/session-hook` แทน
- icon/adaptive launcher (ตอนนี้ยังไม่มี — ปล่อย default ไปก่อน)
