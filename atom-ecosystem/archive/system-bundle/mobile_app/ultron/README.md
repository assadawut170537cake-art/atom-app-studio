# ULTRON Mobile — ATOM Phase 7 (Android, 22 ไฟล)

โ�ดยงานของ node `MOBILE_S10` บนมือถือ S10 ของบอส:
heartbeat เข้าวงจร presence ทุก 20s, kill-switch ยิง VPS, คุยเสยงผาน Gemini Live

โครงนนี้**กูคน+เขยนใหมจาก fragment ท่ paste ขาด** (AtomViewModel_recovered_fragment.kt
ที่ ATOM_SYSTEM/mobile_app) — contract ตรงกบน PC Worker Phase 6 (`X-Atom-Secret`, snake_case)

## เปดงาน (Android Studio Ladybug+)

1. เปดโฟลเดอรนี้เป็น project (import เสรจจะดาวน์โหลด Gradle เอง)
2. copy `local.properties.example` -> `local.properties` แลวกรอก secret
3. Build > Run (min SDK 26 / target 35)

## โคงสราง (ชุด Friday v2 — align ตาม paste ที่มาถึง)

```
settings.gradle.kts  build.gradle.kts  gradle.properties  local.properties.example
app/build.gradle.kts  app/proguard-rules.pro  AndroidManifest.xml
strings.xml  themes.xml (Theme.Ultron)  colors.xml  ic_launcher_foreground.xml
mipmap-anydpi-v26/ic_launcher.xml + ic_launcher_round.xml   <- adaptive icon (vector, แทน PNG ต้นฉบับ)
AtomApp  MainActivity  AtomViewModel        <- สมอง (fragment เดิมรวมอยู่ในน)
ui/AtomScreen  ui/theme/Theme
orb/Orb  orb/OrbState
voice/AudioRecorder  voice/GeminiLiveClient (+AudioPlayer ท้ายไฟล)
data/Dto  data/AtomApi  data/ApiClient
README.md  .gitignore
```

หมายเหต: `local.properties` ใช key `BASE_URL` (ตั้นฉบับ Friday) — `ATOM_BASE_URL` ใชเปน alias ไดดวย

## Contract ที่ตองการจาก VPS (Phase 3 backlog — เหมือน PC Worker)

| Method | Path | Body / Response |
|---|---|---|
| GET  | /health | (probe) |
| GET  | /presence | `{nodes:[{node_id,status,last_seen,metadata}]}` |
| POST | /presence/heartbeat | `{node_id,metadata}` |
| POST | /api/v1/system/kill-switch | `{requested_by}` -> `{ok,message}` |

ตอนน VPS ยงไม deploy: app จะแสดง OFFLINE + retry เงยบ ๆ ไดอยางปลอดภัย

## หมายเหตความปลอดภย / รอยโหว

- secret + Gemini key อยใน `local.properties` (gitignored) แต **ยัง embed ลง BuildConfig = แกะจาก APK ได**
  = ระยะยายควรยายไปขอ credential จาก endpoint เอง (ออกแบบไวแลวใน v6.0 /voice/session-hook)
- ANDROID_ID ใชเฉพาะ `requested_by` ของ kill-switch; `node_id` กำหนดผาน NODE_ID (แกไดถา factory reset)
- voice session ยังไมทำงานเบื้องหลง (ไมมี foreground service) — ตองกาหลดให Phase ถดไป
- ชอ GEMINI_LIVE_MODEL ผนผ่น local.properties — เปลยนไดทันทีถา API ปรบชอ model
