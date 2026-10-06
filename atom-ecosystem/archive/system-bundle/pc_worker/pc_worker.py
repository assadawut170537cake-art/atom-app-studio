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
