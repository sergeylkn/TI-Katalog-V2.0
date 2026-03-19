"""
Claude service stub — Setting model removed.
API key is read from os.environ directly.
All AI calls use inline httpx in api/search.py and api/chat.py.
"""
import os
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)
_API = "https://api.anthropic.com/v1/messages"
_MODEL = "claude-opus-4-5"


async def ai_search(query: str, catalog: List[Dict], db=None) -> Dict:
    """Claude AI semantic search — called by old api/search.py if present."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"matches": [], "summary": "ANTHROPIC_API_KEY not set", "confidence": 0}

    system = (
        "Ти — AI-асистент технічного каталогу. "
        "Відповідай ТІЛЬКИ валідним JSON без пояснень. "
        'Структура: {"matches":[{"id":1,"relevance":0.9,"reason":"..."}],'
        '"summary":"...","confidence":0.9} '
        "Максимум 10 результатів."
    )
    user = f'Запит: "{query}"\n\nКаталог:\n{json.dumps(catalog[:80], ensure_ascii=False)}\n\nЗнайди релевантні товари.'

    try:
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.post(_API, json={
                "model": _MODEL, "max_tokens": 1000,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            }, headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            })
            r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except Exception as e:
        logger.error(f"ai_search error: {e}")
        return {"matches": [], "summary": str(e)[:100], "confidence": 0}


async def chat_response(messages: List[Dict], catalog_context: str = "", db=None) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "ANTHROPIC_API_KEY не налаштовано."
    system = (
        "Ти — AI-асистент технічного каталогу TI-Katalog. "
        "Спілкуйся УКРАЇНСЬКОЮ. Будь точним у технічних параметрах.\n"
        f"{'Товари:\n' + catalog_context if catalog_context else ''}"
    )
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(_API, json={
                "model": _MODEL, "max_tokens": 1024,
                "system": system, "messages": messages,
            }, headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            })
            r.raise_for_status()
        return r.json()["content"][0]["text"]
    except Exception as e:
        return f"Помилка: {e}"


async def recommendations(product: Dict, pool: List[Dict], db=None) -> List[Dict]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return []
    system = "Відповідай ТІЛЬКИ JSON масивом: [{\"id\":1,\"reason\":\"...\"}]"
    user = (
        f"Товар: {product.get('title')} (SKU: {product.get('sku','N/A')})\n"
        f"Знайди 5 схожих:\n{json.dumps(pool[:40], ensure_ascii=False)}"
    )
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(_API, json={
                "model": _MODEL, "max_tokens": 600,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            }, headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            })
            r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except Exception:
        return []
