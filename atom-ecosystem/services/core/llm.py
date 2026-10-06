"""LLM provider layer for ATOM Core.

Providers, in routing preference order:
  ollama  -> local model on the PC (Quadro P4000), zero marginal cost
  gemini  -> Gemini via REST, optional Google Search grounding (web answers
             with real citations)

Every provider returns the same LlmResult shape so callers never branch on
provider. Failures raise LlmUnavailable; the router decides whether to fall
through to the next provider or surface the error.

Keys are read from the environment only. Nothing here is ever logged.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Iterable

import httpx

logger = logging.getLogger("atom-llm")

DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_OLLAMA_MODEL = "qwen3.8:27b"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

REQUEST_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "120"))


class LlmUnavailable(RuntimeError):
    """Raised when a provider cannot serve the request."""


@dataclass
class Source:
    title: str
    uri: str

    def to_dict(self) -> dict[str, str]:
        return {"title": self.title, "uri": self.uri}


@dataclass
class LlmResult:
    text: str
    provider: str
    model: str
    sources: list[Source] = field(default_factory=list)
    searched: bool = False

    def to_dict(self) -> dict[str, Any]:
        # "reply" is the wire key the clients read; "text" stays for
        # backward compatibility with any earlier caller.
        return {
            "reply": self.text,
            "text": self.text,
            "provider": self.provider,
            "model": self.model,
            "searched": self.searched,
            "sources": [s.to_dict() for s in self.sources],
        }


def split_messages(
    messages: Iterable[dict[str, str]],
) -> tuple[str, list[dict[str, str]]]:
    """Split a chat transcript into (system_prompt, turns).

    Ollama has no first-class system role in older builds, so the system
    prompt is hoisted here and merged by the caller that needs it.
    """
    system_parts: list[str] = []
    turns: list[dict[str, str]] = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if not content:
            continue
        if role == "system":
            system_parts.append(content)
        else:
            turns.append({"role": role, "content": content})
    return "\n\n".join(system_parts), turns


def call_ollama(
    messages: list[dict[str, str]],
    model: str | None = None,
    base_url: str | None = None,
) -> LlmResult:
    """Local inference via Ollama. Used when the PC is online and the task is light."""
    url = (base_url or os.getenv("OLLAMA_URL", DEFAULT_OLLAMA_URL)).rstrip("/")
    name = model or os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
    system, turns = split_messages(messages)

    # Ollama keeps no system role; prefix it onto the first user turn.
    if system:
        first_user = next((t for t in turns if t["role"] == "user"), None)
        if first_user is not None:
            first_user["content"] = f"{system}\n\n{first_user['content']}"
        else:
            turns = [{"role": "user", "content": system}]

    payload = {
        "model": name,
        "messages": turns,
        "stream": False,
        "options": {"temperature": 0.7, "num_ctx": 8192},
    }
    try:
        resp = httpx.post(f"{url}/api/chat", json=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError as exc:
        raise LlmUnavailable(f"ollama unreachable: {exc}") from exc
    except ValueError as exc:
        raise LlmUnavailable(f"ollama returned non-JSON: {exc}") from exc

    text = (data.get("message") or {}).get("content", "").strip()
    if not text:
        raise LlmUnavailable("ollama returned an empty completion")
    return LlmResult(text=text, provider="ollama", model=name)


def call_gemini(
    messages: list[dict[str, str]],
    model: str | None = None,
    use_search: bool = False,
) -> LlmResult:
    """Gemini via the REST surface.

    With use_search the request enables Google Search grounding and the
    grounding chunks become Source entries. This is what gives an answer real
    citations instead of model recall.
    """
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise LlmUnavailable("GEMINI_API_KEY is not set")
    name = model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    system, turns = split_messages(messages)

    contents = [
        {
            "role": "model" if t["role"] == "assistant" else "user",
            "parts": [{"text": t["content"]}],
        }
        for t in turns
    ]
    if not contents:
        raise LlmUnavailable("no usable turns for gemini")

    payload: dict[str, Any] = {"contents": contents}
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    if use_search:
        payload["tools"] = [{"google_search": {}}]

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{name}:generateContent"
    )
    try:
        resp = httpx.post(url, params={"key": key}, json=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        raise LlmUnavailable(f"gemini HTTP {exc.response.status_code}") from exc
    except httpx.HTTPError as exc:
        raise LlmUnavailable(f"gemini unreachable: {exc}") from exc

    candidates = data.get("candidates") or []
    if not candidates:
        raise LlmUnavailable("gemini returned no candidates")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise LlmUnavailable("gemini returned an empty completion")

    sources: list[Source] = []
    grounding = candidates[0].get("groundingMetadata") or {}
    for chunk in grounding.get("groundingChunks") or []:
        web = chunk.get("web") or {}
        uri = web.get("uri")
        if uri:
            sources.append(Source(title=web.get("title") or uri, uri=uri))

    # de-dupe by uri, keep first-seen order
    seen: set[str] = set()
    unique: list[Source] = []
    for s in sources:
        if s.uri not in seen:
            seen.add(s.uri)
            unique.append(s)

    return LlmResult(
        text=text,
        provider="gemini",
        model=name,
        sources=unique,
        searched=use_search and bool(unique),
    )


def available_providers() -> list[str]:
    """Providers that are configured right now, best-first."""
    found: list[str] = []
    if os.getenv("GEMINI_API_KEY"):
        found.append("gemini")
    # Ollama is always listed; failure is detected at call time, not here.
    found.append("ollama")
    return found


def complete(
    messages: list[dict[str, str]],
    mode: str = "auto",
    use_search: bool = False,
    prefer_local: bool = True,
) -> LlmResult:
    """Route a completion across providers.

    mode:
      auto  - search needs Gemini so search wins; otherwise local is tried first
      local - force Ollama only
      api   - force Gemini only (the only option that can cite sources)
    """
    local_model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
    gemini_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    gemini_ready = bool(os.getenv("GEMINI_API_KEY"))

    attempts: list[tuple[str, str, bool]] = []  # (provider, model, use_search)

    if mode == "local":
        attempts.append(("ollama", local_model, False))
    elif mode == "api":
        attempts.append(("gemini", gemini_model, use_search))
    else:  # auto
        if use_search and gemini_ready:
            attempts.append(("gemini", gemini_model, True))
        if prefer_local:
            attempts.append(("ollama", local_model, False))
        if gemini_ready:
            attempts.append(("gemini", gemini_model, False))

    if not attempts:
        raise LlmUnavailable("no provider available - set GEMINI_API_KEY or start Ollama")

    errors: list[str] = []
    for provider, model, search in attempts:
        try:
            if provider == "ollama":
                return call_ollama(messages, model=model)
            return call_gemini(messages, model=model, use_search=search)
        except LlmUnavailable as exc:
            logger.info("provider %s unavailable: %s", provider, exc)
            errors.append(f"{provider}: {exc}")

    raise LlmUnavailable("; ".join(errors))
