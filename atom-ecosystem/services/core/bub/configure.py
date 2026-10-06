"""Configuration management for Bub Framework."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

_CONFIG_DATA: dict[str, Any] = {}


def load(config_file: Path | None = None) -> dict[str, Any]:
    global _CONFIG_DATA
    if config_file and config_file.is_file():
        try:
            content = config_file.read_text(encoding="utf-8")
            _CONFIG_DATA = yaml.safe_load(content) or {}
        except Exception:
            _CONFIG_DATA = {}
    return _CONFIG_DATA


def get_config_data() -> dict[str, Any]:
    return dict(_CONFIG_DATA)


def get_value(key: str, default: Any = None) -> Any:
    parts = key.split(".")
    curr: Any = _CONFIG_DATA
    for part in parts:
        if isinstance(curr, dict) and part in curr:
            curr = curr[part]
        else:
            return os.getenv(key.upper().replace(".", "_"), default)
    return curr


def merge(target: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    for k, v in source.items():
        if isinstance(v, dict) and k in target and isinstance(target[k], dict):
            merge(target[k], v)
        else:
            target[k] = v
    return target


def validate(config: dict[str, Any]) -> dict[str, Any]:
    return config
