from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import requests
import re
import os

app = FastAPI(title="ATOM to Hermes/Ollama Gateway")

class ChatRequest(BaseModel):
    message: str
    target: str = "hermes"  # options: "hermes" or "ollama"
    model: str = "qwen2.5-coder:32b" # used only if target="ollama"

class ChatResponse(BaseModel):
    reply: str
    source: str

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    if req.target.lower() == "hermes":
        # เรียกใช้ Hermes Agent แบบ One-Shot (-z)
        try:
            # ใช้ activate.ps1 ของ hermes-agent แล้วรัน hermes -z
            ps_script = f"cd j:\\typesafe\\hermes-agent; .\\activate.ps1; hermes -z \"{req.message}\""
            result = subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True,
                text=True,
                encoding="utf-8"
            )
            
            if result.returncode != 0:
                raise HTTPException(status_code=500, detail=f"Hermes Error: {result.stderr}")
                
            raw_reply = result.stdout.strip()
            # ตัดข้อความ setup ของ activate.ps1 ออก
            lines = raw_reply.splitlines()
            start_idx = 0
            for i, line in enumerate(lines):
                if "Tools + dependencies installed" in line or "already installed" in line:
                    start_idx = i + 1
            reply = "\n".join(lines[start_idx:]).strip()
            
            return ChatResponse(reply=reply, source="Hermes Agent")
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    elif req.target.lower() == "ollama":
        # เรียกใช้ Ollama ตรงๆ โดยไม่ผ่าน Hermes
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": req.model,
            "prompt": req.message,
            "stream": False
        }
        try:
            response = requests.post(url, json=payload, timeout=300)
            response.raise_for_status()
            ans = response.json().get("response", "")
            
            # ลบแท็ก <think> ถ้ามี
            clean_ans = re.sub(r'<think>.*?</think>', '', ans, flags=re.DOTALL).strip()
            
            return ChatResponse(reply=clean_ans, source=f"Ollama ({req.model})")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ollama Error: {e}")
            
    else:
        raise HTTPException(status_code=400, detail="Invalid target. Use 'hermes' or 'ollama'")

if __name__ == "__main__":
    import uvicorn
    # รันเซิร์ฟเวอร์พอร์ต 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
