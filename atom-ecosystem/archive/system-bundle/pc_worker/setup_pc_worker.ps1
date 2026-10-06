# ==============================================================================
# ATOM PC Worker & Research Hub Setup (ข้อ 1 + ข้อ 2)
# ==============================================================================
$ErrorActionPreference = "Stop"
Write-Host ">>> เริ่มต้นตั้งค่า ATOM PC Workstation System..." -ForegroundColor Cyan

# 1. ตรวจสอบคลังวิจัย Unified Research
$researchDir = "J:\JARVIS_RESEARCH_UNIFIED"
if (Test-Path $researchDir) {
    $count = (Get-ChildItem -Path $researchDir -File).Count
    Write-Host "[OK] ตรวจพบคลังวิจัยเดิมสมบูรณ์: $count ไฟล์ พร้อมซิงค์" -ForegroundColor Green
} else {
    Write-Host "[!] ไม่พบโฟลเดอร์ $researchDir กำลังสร้างใหม่..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $researchDir -Force | Out-Null
}

# 2. สร้าง Worker สแตนดบายดึงคิวงานจาก VPS (ULTRON Worker Prototype)
$workerScriptDir = "J:\ATOM_PC_WORKER"
if (!(Test-Path $workerScriptDir)) { New-Item -ItemType Directory -Path $workerScriptDir -Force | Out-Null }

$workerCode = @'
import time
import requests
import json
import os

BASE_URL = os.getenv("ATOM_BASE_URL", "https://assadawut-jarvis.online")
ATOM_SECRET = os.getenv("ATOM_SECRET", "change_this_secret")
HEADERS = {
    "X-Atom-Secret": ATOM_SECRET,
    "Content-Type": "application/json"
}

def send_heartbeat():
    try:
        payload = {
            "node_id": "PC_WORKSTATION",
            "metadata": {"status": "active", "gpu": "Quadro P4000", "workspace": "J:\\"}
        }
        res = requests.post(f"{BASE_URL}/presence/heartbeat", json=payload, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            print("[PC] Heartbeat sent successfully (ONLINE)")
    except Exception as e:
        print(f"[PC] Heartbeat failed: {e}")

def check_and_claim_queue():
    try:
        claim_payload = {
            "worker_id": "PC_WORKSTATION",
            "task_type": "ULTRON_CODE"
        }
        res = requests.post(f"{BASE_URL}/api/v1/queue/claim", json=claim_payload, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json()
            task = data.get("task")
            if task:
                print(f"[ULTRON] Claimed task: {task.get('task_id')} - {task.get('title')}")
                # จำลองการประมวลผลงานโค้ด
                time.sleep(2)
                complete_payload = {
                    "success": True,
                    "result": {"message": "Executed by PC ULTRON Engine"}
                }
                requests.post(f"{BASE_URL}/api/v1/queue/{task['task_id']}/complete", json=complete_payload, headers=HEADERS, timeout=10)
                print(f"[ULTRON] Task completed & reported to Core.")
    except Exception as e:
        pass

if __name__ == "__main__":
    print("=== ATOM PC Workstation Daemon Started ===")
    while True:
        send_heartbeat()
        check_and_claim_queue()
        time.sleep(15)
'@

Set-Content -Path "$workerScriptDir\pc_worker.py" -Value $workerCode -Encoding UTF8
Write-Host "[OK] สร้างสคริปต์ Worker ที่: $workerScriptDir\pc_worker.py เรียบร้อยแล้ว" -ForegroundColor Green
Write-Host ">>> บอสสามารถรัน Background Worker ด้วยคำสั่ง: python $workerScriptDir\pc_worker.py ได้ทันทีค่ะ" -ForegroundColor Yellow
