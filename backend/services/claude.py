"""Claude AI service — search · chat · recommendations."""

import json
import logging
from typing import List, Optional, Dict, Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import Setting

logger = logging.getLogger(__name__)
_API = "https://api.anthropic.com/v1/messages"
_MODEL = "claude-opus-4-5"


async def _key(db: AsyncSession) -> str:
    row = await db.scalar(select(Setting).where(Setting.key == "CLAUDE_API_KEY"))
    if not row:
        raise RuntimeError("Claude API ключ не налаштовано. Перейдіть до /admin → Налаштування.")
    return row.value


async def _call(api_key: str, system: str, user: str, max_tokens=1500) -> str:
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": _MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(_API, json=payload, headers=headers)
        r.raise_for_status()
    return r.json()["content"][0]["text"]


def _parse_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)


# ── AI Search ─────────────────────────────────────────────────────────────────

async def ai_search(query: str, catalog: List[Dict], db: AsyncSession) -> Dict:
    key = await _key(db)
    system = (
        "Ти — AI-асистент технічного каталогу продукції. "
        "Відповідай ТІЛЬКИ валідним JSON без пояснень.\n"
        "Структура: {\"matches\":[{\"id\":\"...\",\"relevance\":0.95,\"reason\":\"...\"}],"
        "\"summary\":\"...\",\"confidence\":0.9}\n"
        "Сортуй від найвищої до найнижчої релевантності. Максимум 10 результатів."
    )
    user = (
        f"Запит: \"{query}\"\n\n"
        f"Каталог:\n{json.dumps(catalog[:80], ensure_ascii=False, indent=1)}\n\n"
        "Знайди найбільш релевантні товари."
    )
    try:
        return _parse_json(await _call(key, system, user))
    except json.JSONDecodeError:
        return {"matches": [], "summary": "Помилка розбору відповіді AI", "confidence": 0}


# ── Chat ──────────────────────────────────────────────────────────────────────

async def chat_response(
    messages: List[Dict], catalog_context: str, db: AsyncSession
) -> str:
    key = await _key(db)
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    system = (
        "Ти — AI-асистент технічного каталогу. "
        "Спілкуйся УКРАЇНСЬКОЮ. Будь конкретним і корисним.\n"
        f"{'Доступні товари:\n' + catalog_context if catalog_context else ''}"
    )
    payload = {
        "model": _MODEL,
        "max_tokens": 1024,
        "system": system,
        "messages": messages,
    }
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(_API, json=payload, headers=headers)
        r.raise_for_status()
    return r.json()["content"][0]["text"]


# ── Recommendations ───────────────────────────────────────────────────────────

async def recommendations(
    product: Dict, pool: List[Dict], db: AsyncSession
) -> List[Dict]:
    key = await _key(db)
    system = (
        "Ти — AI-помічник для рекомендацій товарів. "
        "Відповідай ТІЛЬКИ JSON масивом: [{\"id\":\"...\",\"reason\":\"...\"}]"
    )
    user = (
        f"Товар: {product['title']} (SKU: {product.get('sku','N/A')})\n"
        f"Атрибути: {json.dumps(product.get('attributes',{}), ensure_ascii=False)}\n\n"
        f"Знайди 5 схожих або доповнюючих товарів:\n"
        f"{json.dumps(pool[:50], ensure_ascii=False)}"
    )
    try:
        return _parse_json(await _call(key, system, user, max_tokens=600))
    except Exception:
        return []
