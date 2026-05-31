"""Server-side Gemini call (google-genai SDK). The key stays on the server,
loaded from the GEMINI_API_KEY environment variable — never hard-coded,
never committed, never sent to the browser.
"""
import os

from google import genai
from google.genai import types

_client = None


def _get_client() -> "genai.Client":
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def generate(system: str, user: str, max_tokens: int = 2000) -> str:
    # Free-tier models: gemini-2.5-flash / gemini-2.5-flash-lite. Set via env.
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    resp = _get_client().models.generate_content(
        model=model,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens,
            temperature=0.3,
        ),
    )
    return resp.text or ""
