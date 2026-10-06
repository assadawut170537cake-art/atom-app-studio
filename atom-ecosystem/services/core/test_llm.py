"""Smoke-test the LLM layer against a real provider (local Ollama by default).

Run from services/core:  python test_llm.py
"""
import os
import sys

import llm


def main() -> int:
    print("providers:", llm.available_providers())

    messages = [
        {"role": "system", "content": "คุณคืออะตอม ผู้ช่วยส่วนตัวของลูกพี่ ตอบสั้น กระชับ เป็นกันเอง"},
        {"role": "user", "content": "พูดว่า 'สวัสดีลูกพี่ อะตอมพร้อมแล้ว' สั้น ๆ"},
    ]

    model = os.getenv("TEST_MODEL", "gemma4:e4b")  # small model keeps the test fast
    print(f"testing ollama with model={model} ...")
    try:
        result = llm.call_ollama(messages, model=model)
    except llm.LlmUnavailable as exc:
        print("FAIL:", exc)
        return 1

    print("provider:", result.provider)
    print("model   :", result.model)
    print("reply   :", result.text[:300])
    if not result.text.strip():
        print("FAIL: empty completion")
        return 1

    print("\nOK - local inference works")
    return 0


if __name__ == "__main__":
    sys.exit(main())
