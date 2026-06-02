"""Fallback LLM via OpenRouter (OpenAI-compatible chat completions).
Key from OPENROUTER_API_KEY. Default model openai/gpt-oss-120b:free
(override with OPENROUTER_MODEL)."""
import os

_URL = "https://openrouter.ai/api/v1/chat/completions"


def generate(system: str, user: str, max_tokens: int = 8192) -> str:
    import requests  # lazy import: only needed when this provider is used
    key = os.environ["OPENROUTER_API_KEY"]
    model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
    resp = requests.post(
        _URL,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "X-Title": "UTM Site Docs",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.3,
        },
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    msg = (data.get("choices") or [{}])[0].get("message", {}) or {}
    return msg.get("content") or ""
