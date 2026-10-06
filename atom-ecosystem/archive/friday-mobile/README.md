# FRIDAY Mobile (Phase 8)

Orchestrator ของ Assadawut — หญิง สภุ าพ ใช้ ค่ะ/นะคะ
Fork โครงสรางจาก Phase 7 (ULTRON Mobile) แตนออกแบบตาง: 4 tabs + Room DB + Import Gemini History

## Features (20 blocks ตาม brief)

| Tab | หนาที่ |
|---|---|
| เวork์กสเปซ (Workspace) | รายการ specs จาก Room DB (draft/synced) |
| เขียน (Editor) | เขียน prose/TDD spec + บันทึก ลง Room |
| แชท (Chat) |คุยกับ FRIDAY ผาน Gemini 2.5 Flash (persona ค่ะ/นะคะ) + sync เขากบ VPS |
| ระบบ (System) | Presence (PC/MOBILE), Kill Switch, Resume, ปุ่มนำเข้าประวัติ |
| Import (overlay) | วาง JSON จาก AI Studio → append ทีละข้อความเข้า chat history VPS |

## Setup

1. `copy local.properties.example local.properties` แล้วเติม:
   - `ATOM_SECRET` = ค่าเดียวกับ `ATOM_SECRET` บน VPS
   - `GEMINI_API_KEY` = คีย์จาก AI Studio
   - `BASE_URL` = https://assadawut-jarvis.online (แก้ถ้าใช้ host อื่น)
2. เปิด Android Studio → Open `FRIDAY/` → Sync → Run
   หรือ CLI: `gradlew assembleDebug && adb install app/build/outputs/apk/debug/app-debug.apk`

## หมายเหตุดานเทคนิก (แกว ตอ paste ตนวับ Friday)

- Kotlin 1.9.25 + KSP 1.9.25-1.0.20 (คูกับ composeCompiler 1.5.15 — 1.9.24 ไมคอมไพล)
- Icon: adaptive vector (`res/drawable/ic_launcher_foreground.xml` + `mipmap-anydpi-v26/`) แทน PNG ตนวับจริง
- Import overlay เปนสีดำทึบ (`background(Color.Black)`) กันมองทะลุเห็น tab ลาง
- `LinearProgressIndicator` ใช lambda overload (material3 1.3 ตาม BOM 2024.09)
- Kill Switch อยูใน FRIDAY ตาม brief Phase 8 (ตวาง ULTRON ที่ไม่มี)

## Endpoint ที่ตองการบน VPS (Phase 3 ของ Core)

`/presence/status` `/presence/heartbeat` `/emergency/kill-switch` `/emergency/resume` —
ถายังไม deploy ระบบจะแสดง OFFLINE (behavior ตั้งใจ)
