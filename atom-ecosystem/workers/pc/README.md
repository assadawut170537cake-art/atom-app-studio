# ULTRON PC Worker Daemon — ATOM Phase 6 (Windows 11)

Deamon ฝั่ง PC ของบอส (J:\ATOM_PC_WORKER) ส่ง heartbeat เป็น node `PC_WORKSTATION`
และดึงคิวงาน (`ULTRON_CODE`) จาก ATOM Core บน VPS ผ่าน Cloudflare Tunnel

## ไฟล์ในชุด (7)

| ไฟล์ | หน้าวสิย |
|---|---|
| `requirements.txt` | lib: requests, python-dotenv |
| `.env.example` | แม่แบบตั้ งค่า — copy เป็น `.env` แล้วกรอก `ATOM_SECRET` |
| `ultron_daemon.py` | ตัว deamon หลัก (ดูหัวข้อ "สถานะ Endpoint") |
| `run_ultron_daemon.bat` | ดับเบิลคลิก รันเลย (สราง venv + ติดตั้ง lib ให้อัตโนมัติ) |
| `.gitignore` | กัน .env / venv / log หลุดขึ้น git |
| `test_connection.py` | เทสการเชื่ อมต่อ + secret ครั้ งเดียวจบ (exit 0/2/1) |
| `README.md` | ไฟล์นนี้ |

## เริ่ มไว

```bat
cd J:\ATOM_PC_WORKER
copy .env.example .env    :: แล้วแก ATOM_SECRET ใหตรงกันกับ VPS
python test_connection.py :: ตรวจการเชื่ อมต่อกอน
run_ultron_daemon.bat     :: รัน deamon (ปดหนาตาง = หยุด)
```

ทดสอบรอบเดียวจบ (ไม รันลูปตลอดไป):

```bat
set ULTRON_MAX_CYCLES=1 && python ultron_daemon.py
```

log เขียนลงทั้ ง console และ `ultron_daemon.log`

## ⚠️ สถานะ Endpoint ฝั ง Server (Core v6.0)

Deamon ออกแบบให **รัน idle ตอได ตลอด** ระหวางรอ Phase 3:

| Endpoint | สถานะบน Core v6.0 | Deamon ประพฤติตัว |
|---|---|---|
| `GET /health` | มี | test_connection ใช ยืนยัน |
| `POST /presence/heartbeat` | **ยังไม มี** (Phase 3) | log `NOT_IMPLEMENTED` ครั้ งเดียว ไม spam, รันตอ |
| `POST /api/v1/queue/claim` | **ยังไม มี** (Phase 3) | เช่นกัน |
| `POST /api/v1/queue/{id}/complete` | **ยังไม มี** (Phase 3) | — |
| Cloudflare 530 | เกิดถาย tunnel/service ยังไม รัน | test_connection สรุปตรง ๆ, daemon ใช้ backoff |

## ความปลอดภัย

- Task execution เปน **stub ปลอดภัยเป น default** — daemon ไม รัน command ใด ๆ
  ที่มาจาก server จนกวาจะตั้ ง `ULTRON_EXEC_ENABLED=1` (เปิดเฉพาะเมื่ อเชื่ อถือ Core แลว)
- `.env` (มี secret) ถูกระงับใน `.gitignore` แลว — อยา commit เด็ดขาด

## โน็ต

- `pc_worker.py` (proตรอบกอน) ยงเก็บไวเปน legacy + backup ขางในโฟลเดอรเดียวกัน
  ตัวที่ใชงานจริงตอไปคือ `ultron_daemon.py`
- P4000 metadata ส่งไปแบบ hardcode ตาม contract เดิม — แก ใน `METADATA` ของ daemon
