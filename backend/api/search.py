"""Hybrid search — Claude AI semantic + PostgreSQL ILIKE fallback."""
import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.models import Product, Document

logger = logging.getLogger(__name__)
router = APIRouter()


async def _ai_search(query: str, section_id: Optional[int]) -> list:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        return []
    try:
        import httpx
        system = "You are a search assistant for industrial catalog. Return JSON array of search keywords in Ukrainian and English to find the product. Format: [\"keyword1\",\"keyword2\",...]. Max 5 keywords."
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 100,
                      "system": system,
                      "messages": [{"role": "user", "content": query}]},
            )
            r.raise_for_status()
        import json
        raw = r.json()["content"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except Exception as e:
        logger.debug(f"AI search: {e}")
        return []


@router.get("/")
async def search(
    q: str = Query(..., min_length=1),
    section_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    # Try AI keyword expansion
    keywords = await _ai_search(q, section_id)
    all_terms = list({q, *keywords})

    # Build ILIKE query
    filters = []
    for term in all_terms[:5]:
        t = f"%{term}%"
        filters.append(or_(Product.title.ilike(t), Product.sku.ilike(t), Product.description.ilike(t)))

    from sqlalchemy import or_ as sql_or
    base_q = select(Product)
    if filters:
        base_q = base_q.where(sql_or(*filters))
    if section_id:
        base_q = base_q.where(Product.section_id == section_id)

    rows = (await db.execute(base_q.order_by(Product.title).offset((page-1)*page_size).limit(page_size))).scalars().all()

    results = []
    for p in rows:
        doc = await db.get(Document, p.document_id)
        results.append({
            "id": p.id, "title": p.title, "sku": p.sku,
            "description": p.description, "attributes": p.attributes or {},
            "section_id": p.section_id, "document_id": p.document_id,
            "page_number": p.page_number,
            "document_url": (f"{doc.file_url}#page={p.page_number}" if doc and p.page_number else (doc.file_url if doc else None)),
            "primary_image": None,
            "source": "ai+pg" if keywords else "pg",
        })

    return {"query": q, "results": results, "count": len(results), "source": "ai+pg" if keywords else "pg"}


@router.get("/suggest")
async def suggest(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    t = f"%{q}%"
    r = await db.execute(
        select(Product.title, Product.sku).where(
            or_(Product.title.ilike(t), Product.sku.ilike(t))
        ).limit(8)
    )
    rows = r.all()
    return {"suggestions": [{"title": row[0], "sku": row[1]} for row in rows]}
