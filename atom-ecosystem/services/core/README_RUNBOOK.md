# ATOM Core Phase 2 Acceptance Runbook

## 0. ตรวจ Service
sudo systemctl status atom-core
# Expected: Active: active (running)
sudo journalctl -u atom-core -n 50 --no-pager
# ต้องไม่มี RuntimeError, Traceback, ModuleNotFoundError

## 1. Health Check (ไม่ใช้ Secret)
curl -i http://127.0.0.1:8000/health
# Expected: 200 OK {"status": "ok", "service": "atom-core", "timestamp": "..."}

## 2. Phase 1 Ping Tests
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" http://127.0.0.1:8000/api/v1/atom/ping
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" http://127.0.0.1:8000/api/v1/friday/ping
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" http://127.0.0.1:8000/api/v1/ultron/ping
# Expected: {"service": "...", "status": "online"}

## 3. Sync Push (Batch)
curl -i \
  -H "Content-Type: application/json" \
  -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  -X POST \
  -d '{"updates": [{"key": "user_theme", "value": "dark", "updated_at": "2026-10-01T00:00:00Z", "updated_by": "atom"}]}' \
  http://127.0.0.1:8000/api/v1/sync/push
# Expected: {"status": "ok", "count": 1}

## 4. Sync Pull
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  http://127.0.0.1:8000/api/v1/sync/pull

## 5. LWW Conflict Test
# Push เก่ากว่า
curl -i \
  -H "Content-Type: application/json" \
  -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  -X POST \
  -d '{"updates": [{"key": "user_theme", "value": "old", "updated_at": "2025-01-01T00:00:00Z", "updated_by": "test"}]}' \
  http://127.0.0.1:8000/api/v1/sync/push
# Pull: user_theme ต้องยังเป็น "dark"

## 6. Chat Append
curl -i \
  -H "Content-Type: application/json" \
  -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  -X POST \
  -d '{"session_id": "test-001", "role": "user", "message": "Hello"}' \
  http://127.0.0.1:8000/api/v1/sync/chat/append

## 7. Chat History
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  "http://127.0.0.1:8000/api/v1/sync/chat/history?session_id=test-001"

## 8. Knowledge Query
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  "http://127.0.0.1:8000/api/v1/knowledge/query?q=whisper"

## 9. SQL Injection Safety
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  "http://127.0.0.1:8000/api/v1/knowledge/query?q=O'Brien"
# Expected: 200 OK (ไม่ใช่ 500)

## 10. Backup Now
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  -X POST http://127.0.0.1:8000/api/v1/system/backup-now
# Expected: {"id": "...", "name": "atom_master_YYYYMMDD_HHMMSS.db"}

## 11. Voice Hook
curl -i -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  http://127.0.0.1:8000/voice/session-hook

## Error Cases
### 12. ไม่มี Secret -> 401 Missing
curl -i http://127.0.0.1:8000/api/v1/atom/ping

### 13. Secret ผิด -> 401 Invalid
curl -i -H "X-Atom-Secret: wrong" http://127.0.0.1:8000/api/v1/atom/ping

### 14. Push key ว่าง -> 400
curl -i -H "Content-Type: application/json" -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  -X POST -d '{"updates": [{"key": "", "value": "x", "updated_at": "2026-10-01T00:00:00Z", "updated_by": "a"}]}' \
  http://127.0.0.1:8000/api/v1/sync/push

### 15. Push ไม่มี updated_at -> 400
curl -i -H "Content-Type: application/json" -H "X-Atom-Secret: YOUR_ATOM_SECRET" \
  -X POST -d '{"updates": [{"key": "test", "value": "x", "updated_by": "a"}]}' \
  http://127.0.0.1:8000/api/v1/sync/push
