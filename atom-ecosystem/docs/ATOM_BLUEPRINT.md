# A.T.O.M. MASTER BLUEPRINT v7.0 (Merged Single Source of Truth)

ชื่อโครงการ: A.T.O.M. (Autonomous Transcendence Operations Matrix / อะตอม)
วันที่ผสาน: 1 ตุลาคม 2569 (2026-10-01) | เจ้าของระบบ: ลูกพี่ | สถานะ: ใช้งานจริง
ผสานจาก: (1) Tri-Core Master Manifesto 2026-09-30 (2) J.A.R.V.I.S. Prompt Pack v1
(3) GPT build notes + อะตอม 1.pdf (4) FRIDAY brief reset PDFs

## Merge manifest: เก็บ / ตัด
เก็บ: cloud-core ทั้งชุด (main/database/gdrive/service/migration/runbook), API contract
หลัก (auth/status/chat-ws/memory/voice/approvals), Flutter 6-phase plan, mock backend
spec, Tri-Core + Security Laws ทั้ง 13 ข้อ, Persona แยกไฟล์, Profile Isolation
ตัด: ชื่อ jarvis/NAMING เก่า, HMAC/Dual-key รอบนี้ (Creed V5), Voice Proxy ผ่าน VPS
(ใช้ mobile_direct), spec ซ้ำใน PDF (เนื้อหาเดียวกับโค้ดที่มี), mock auth demo/demo
(ใช้ ATOM_SECRET + Bearer จริง)

## 1. Pre-Flight (AI ทุกตัวอ่านก่อนแตะระบบ)
ห้ามลดทอนความสามารถ รักษามาตรฐานสูงสุดเสมอ

## 2. Master Creed + Safety Alignment
"ทำแล้วต้องดีกว่าที่มี เริ่มแล้วต้องสำเร็จ ผลต้องอลังการเหนือกว่าทั่วไป"
Safety (Approval Gates/Kill Switch/Whitelist) อยู่เหนือคติเสมอ ห้ามบายพาส
ติดบล็อก -> หาทางอื่นที่ถูกกฎ -> ไร้ทางออกให้ Stop/Report/Ask ลูกพี่ทันที

## 3. Tri-Core
| ตัว | บทบาท | เสียง/UI | บุคลิก |
| ATOM | หน้าบ้าน คุยเสียงสด สลับโมเดลทุกค่าย | Orb ฟ้าคราม | กวนตีนเหน็บแนม งานมาเอาจริง 100% |
| FRIDAY | สมองสถาปัตย์ Gemini Spark 40+ สกิล Workspace 100% วิจัย 06:00 | Orb เขียวมรกต | สุภาพ นิ่ง มืออาชีพ |
| ULTRON | Heavy coder โคลน Cline ใน Sandbox + Master Key | Orb แดงเพลิง | ดุดัน ไร้หางเสียง ดักทางบอสก่อนสั่ง |

## 4. Handoff Protocol
ท่อเสียงเดี่ยวไม่ตัด (Persistent Stream) ส่ง agent_id ผ่าน WS เดิม
งานค้างรันต่อ bg + ตัด TTS ทันที Orb ใช้สี+Motion/Pulsing+ไอคอน (แดง Ultron
แยกจากแดง Emergency Mute ชัดเจน)
"ต่อสายไฟรเดย์" / "ต่อสายอัลตรอน"(+Master Key) / "ตัดสายกลับมาอะตอม"

## 5. Memory Fabric
กลาง SQLite (app_states LWW + chat_history) ผ่าน cloud-core; Vector เสริมเฟสถัดไป

## 6. Security Laws (ย่อ)
1) HIGH ต้องผูก command_hash SHA-256; Mobile คือผู้ตัดสินสูงสุด Desktop Modal
เป็น fail-safe 2) ULTRON ใน container/VM + egress allowlist เฉพาะ Model API;
passcode ตรวจ Argon2id/Bcrypt ห้ามผ่าน LLM/ล็อก; สอดแนมได้แค่ Suggest ลงมือ
ต้องผ่าน Gate 3) Pipeline: ATOM คัด intent -> FRIDAY สเปก+TDD -> ULTRON โค้ด
ใน sandbox -> FRIDAY ตรวจ AST/Test (แนะนำเท่านั้น) -> Mobile อนุมัติ -> Apply
4) FRIDAY แยก Read/Write; ลบ/ส่งเมล/แชร์ ต้อง One-Tap + audit log ระบุ agent_id
5) consumed_at บันทึกตอน Apply สำเร็จเท่านั้น; Modal ไม่ reject ตัวเอง
6) Palette = Win+Alt+Space 7) Secrets สิทธิ์ 600 + Dual-key rotation
8) Persona แยกไฟล์ agents/*.md ซื่อตรงเหนือบุคลิก 9) Queue re-sign ตอน dispatch
(60s expiry) 10) Retry: subtask<=3 handoff<=2 task<=15min + token budget
11) Profile Isolation: ห้าม PII ใน repo/prompt เก็บใน local_user_profile.json

## 7. System Map
cloud-core: /opt/atom-core atom-core.service (done ไม่แตะ)
mobile-app: Flutter (android/ios/windows) คุย cloud ทาง REST + Gemini ตรง
(desktop actuator/VM ULTRON = เฟสถัดไป)

## 8. API (cloud จริง)
GET /health | GET /api/v1/{atom,friday,ultron}/ping | POST /api/v1/sync/push
| GET /api/v1/sync/pull | POST /api/v1/sync/chat/append
| GET /api/v1/sync/chat/history?session_id= | GET /api/v1/knowledge/query?q=
| POST /api/v1/system/backup-now | GET /voice/session-hook (mobile_direct)
Auth: X-Atom-Secret | Error: {"error":{"code":..,"message":..}}
Approvals เก็บผ่าน sync keys `approval_req/*` + `approval_dec/*` (LWW)

## 9. Acceptance
health 200, ping x3, push/pull LWW ถูก, chat append/history, q=O'Brien ไม่ 500,
backup-now ได้ id, voice-hook ได้ endpoint+model, แอปรัน analyze ผ่าน, สลับ
agent+Master Key ถูก, approve/deny ซิงก์ขึ้น cloud
