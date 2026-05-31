"""Server-side Gemini call (google-genai SDK). Key loaded from GEMINI_API_KEY."""
import os

from google import genai
from google.genai import types

_client = None


def _get_client() -> "genai.Client":
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def generate(system: str, user: str, max_tokens: int = 8192) -> str:
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    resp = _get_client().models.generate_content(
        model=model,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens,
            temperature=0.3,
            # 2.5 Flash is a thinking model; thinking spends output tokens and can
            # truncate the JSON. Disable it so the full answer fits.
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return resp.text or ""
