# ============================================================
#  Hybrid CPU/RAM Offload config for Quadro P4000 (8GB VRAM)
#  RAM 128GB / Xeon E5-2690 v3 x2 (24C/48T)
#  Set by: Hybrid offload setup
# ============================================================

# Parallel request slots (each slot can hold its own context)
OLLAMA_NUM_PARALLEL=2

# Load only 1 model at a time - frees VRAM, avoids thrashing
OLLAMA_MAX_LOADED_MODELS=1

# Keep model in RAM 30 min so repeat calls are instant
OLLAMA_KEEP_ALIVE=30m

# Context length: 8K is safe for large models on this setup.
# Raise to 16384 for better long-context, costs more KV cache RAM.
OLLAMA_CONTEXT_LENGTH=8192

# Flash attention: DISABLED - P4000 is Pascal (compute 6.1), no FA support
OLLAMA_FLASH_ATTENTION=0

# Keep models in RAM between requests so they don't re-read from disk
OLLAMA_LOAD_TIMEOUT=10m

# Allow long generation without cutting off
OLLAMA_MAX_VOCAB=65536
