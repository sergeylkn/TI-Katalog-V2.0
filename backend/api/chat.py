"""AI Chat + Recommendations."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import Product
from services.claude import chat_response, recommendations as ai_recs

router = APIRouter()


class Msg(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    messages: List[Msg]
    section_id: str | None = None


@router.post("/message")
async def message(body: ChatIn, db: AsyncSession = Depends(get_db)):
    if not body.messages:
        raise HTTPException(400, "Повідомлення порожнє")
    products = (await db.scalars(select(Product).limit(30))).all()
    context = "\n".join(f"- {p.title} (SKU: {p.sku or 'N/A'})" for p in products[:20])
    msgs = [{"role": m.role, "content": m.content} for m in body.messages]
    try:
        reply = await chat_response(msgs, context, db)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    return {"reply": reply}


@router.get("/recommendations/{prod_id}")
async def recommend(prod_id: str, db: AsyncSession = Depends(get_db)):
    import uuid
    p = await db.get(Product, uuid.UUID(prod_id))
    if not p:
        raise HTTPException(404, "Товар не знайдено")
    all_p = (await db.scalars(select(Product).limit(80))).all()
    pool = [{"id": str(x.id), "title": x.title, "sku": x.sku}
            for x in all_p if str(x.id) != prod_id]
    product_dict = {"id": str(p.id), "title": p.title, "sku": p.sku,
                    "attributes": p.attributes or {}}
    try:
        recs = await ai_recs(product_dict, pool, db)
    except Exception:
        recs = []
    by_id = {str(x.id): x for x in all_p}
    result = []
    for r in recs[:5]:
        pid = r.get("id")
        if pid and pid in by_id:
            x = by_id[pid]
            result.append({"id": str(x.id), "title": x.title, "sku": x.sku, "reason": r.get("reason", "")})
    return {"recommendations": result}
