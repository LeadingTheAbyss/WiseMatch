"""Groq chat-completions client (OpenAI-compatible)."""
import json

import httpx

from . import trace
from .config import settings

URL = "https://api.groq.com/openai/v1/chat/completions"


def available() -> bool:
    return bool(settings.groq_api_key)


async def complete(messages: list[dict], label: str, json_mode: bool = False, temperature: float = 0.4, max_tokens: int = 500) -> str | None:
    if not available():
        return None
    body: dict = {"model": settings.groq_model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens + 400}
    if "gpt-oss" in settings.groq_model:
        body["reasoning_effort"] = "low"
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    with trace.Timer() as tm:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(URL, json=body, headers={"Authorization": f"Bearer {settings.groq_api_key}"})
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            trace.log("llm", f"Groq {label} failed", str(exc)[:140], source="groq", ok=False)
            return None
    trace.log("llm", f"Groq · {label}", settings.groq_model, ms=tm.ms, source="groq")
    return text


async def complete_json(messages: list[dict], label: str, **kw) -> dict | None:
    text = await complete(messages, label, json_mode=True, **kw)
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None
