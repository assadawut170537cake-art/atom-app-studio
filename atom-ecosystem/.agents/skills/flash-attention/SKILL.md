---
name: flash-attention
description: Optimize LLM/ML transformer training and inference using FlashAttention (FlashAttention-2/3) CUDA kernels. Use when asked to accelerate PyTorch transformer models or optimize VRAM usage.
---

# FlashAttention Skill

This skill provides guidelines and code patterns for integrating **FlashAttention-2** or **FlashAttention-3** into PyTorch transformer models to accelerate attention mechanisms and reduce memory consumption ($O(N)$ memory complexity).

## Installation
```bash
pip install flash-attn --no-build-isolation
```

## PyTorch Integration Pattern

```python
import torch
from flash_attn import flash_attn_qkvpacked_func, flash_attn_func

# Query, Key, Value shapes: (batch_size, seq_len, nheads, head_dim)
q = torch.randn(2, 1024, 16, 64, device="cuda", dtype=torch.float16)
k = torch.randn(2, 1024, 16, 64, device="cuda", dtype=torch.float16)
v = torch.randn(2, 1024, 16, 64, device="cuda", dtype=torch.float16)

# Efficient attention computation
out = flash_attn_func(q, k, v, dropout_p=0.0, causal=True)
```

## Best Practices
- Ensure GPU architecture supports FlashAttention (NVIDIA Ampere A100/RTX 30xx or newer).
- Inputs must be in `float16` or `bfloat16` precision.
