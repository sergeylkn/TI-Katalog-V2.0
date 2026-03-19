"""AI Chat API."""

import os
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import Product

logger = logging.getLogger(__name__)
router = APIRouter()


class Msg(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    messages: List[Msg]


@router.post("")
@router.post("/")
async def chat(body: ChatIn, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"reply": "⚠️ ANTHROPIC_API_KEY не налаштовано. Перейдіть в адмін-панель."}

    # Get light catalog context
    r = await db.execute(select(Product).limit(25))
    products = r.scalars().all()
    ctx = "\n".join(f"- {p.title} (SKU: {p.sku or 'N/A'})" for p in products[:20])

    import httpx, json
    system = (
        "Ти — інтелектуальний помічник техпідтримки TI-Katalog. "
        "Спеціалізація: промислове обладнання (шланги, фітинги, насоси, манометри, ущільнення, арматура). "
        "Відповідай ТІЛЬКИ УКРАЇНСЬКОЮ мовою. Будь точним у технічних параметрах (DN, PN, матеріал).\n"
        f"{'Доступні товари:\n' + ctx if ctx else ''}"
    )
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                json={"model": "claude-opus-4-5", "max_tokens": 1024,
                      "system": system, "messages": messages},
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                         "content-type": "application/json"},
            )
            r.raise_for_status()
        return {"reply": r.json()["content"][0]["text"]}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"reply": f"Помилка AI: {str(e)[:200]}"}
