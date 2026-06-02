"""LLM orchestrator: try Gemini first, fall back to OpenRouter when it errors
(e.g. Gemini free-tier daily quota / 429, network, empty output).
Providers that have an API key set are tried in order."""
import os


def generate(system: str, user: str) -> str:
    providers = []
    if os.environ.get("GEMINI_API_KEY"):
        providers.append("gemini")
    if os.environ.get("OPENROUTER_API_KEY"):
        providers.append("openrouter")
    if not providers:
        raise RuntimeError("No LLM provider configured: set GEMINI_API_KEY and/or OPENROUTER_API_KEY.")

    errors = []
    for name in providers:
        try:
            if name == "gemini":
                from .gemini_client import generate as g
            else:
                from .openrouter_client import generate as g
            out = g(system, user)
            if out and out.strip():
                print(f"[llm] generated via {name}")
                return out
            errors.append(f"{name}: empty response")
        except Exception as e:  # quota / network / etc -> try the next provider
            print(f"[llm] {name} failed: {e}")
            errors.append(f"{name}: {e}")
    raise RuntimeError("All LLM providers failed -> " + " | ".join(errors))
