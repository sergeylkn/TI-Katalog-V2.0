"""
Hybrid Search — Claude AI semantic first, PostgreSQL FTS fallback.
If Claude fails / no key / slow → instant PG full-text search kicks in.
"""

import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.models import Product, Document
from services.cache import cache_get, cache_set

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Quick suggest ─────────────────────────────────────────────────────────────

@router.get("/suggest")
async def suggest(q: str = Query(..., min_length=2), db: AsyncSession = Depends(get_db)):
    t = f"%{q.strip()}%"
    r = await db.execute(
        select(Product.title)
        .where(Product.title.ilike(t))
        .order_by(Product.title)
        .limit(10)
    )
    titles = r.scalars().all()
    r2 = await db.execute(
        select(Product.sku)
        .where(Product.sku.ilike(t), Product.sku.isnot(None))
        .limit(5)
    )
    skus = r2.scalars().all()
    suggestions = list(dict.fromkeys([x[:80] for x in titles] + list(skus)))[:10]
    return {"suggestions": suggestions}


# ── Main search ───────────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
async def search(
    q:          str = Query(..., min_length=1),
    section_id: Optional[int] = None,
    limit:      int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = q.strip()

    # 1. Check cache
    cached = await cache_get(query, str(section_id))
    if cached:
        return {**cached, "cached": True}

    # 2. Try Claude AI search
    ai_key = os.getenv("ANTHROPIC_API_KEY")
    if ai_key:
        try:
            result = await _ai_search(query, section_id, limit, db)
            await cache_set(query, result, str(section_id))
            return result
        except Exception as e:
            logger.warning(f"AI search failed, falling back to PG FTS: {e}")

    # 3. PostgreSQL FTS fallback
    result = await _pg_search(query, section_id, limit, db)
    await cache_set(query, result, str(section_id))
    return result


async def _fetch_candidates(section_id, db) -> list:
    q = select(Product).options(selectinload(Product.images))
    if section_id:
        q = q.where(Product.section_id == section_id)
    q = q.limit(150)
    r = await db.execute(q)
    return r.scalars().all()


def _product_slim(p: Product) -> dict:
    imgs = p.images if hasattr(p, "images") and p.images else []
    primary = next((i for i in imgs if i.is_primary), imgs[0] if imgs else None)
    return {
        "id": p.id,
        "title": p.title,
        "sku": p.sku,
        "description": (p.description or "")[:150],
        "attributes": p.attributes or {},
        "page_number": p.page_number,
        "document_id": p.document_id,
        "section_id": p.section_id,
        "primary_image": primary.image_data if primary else None,
        "bbox": p.bbox,
    }


async def _ai_search(query: str, section_id, limit: int, db) -> dict:
    """Claude AI semantic ranking."""
    import json, httpx, os

    candidates = await _fetch_candidates(section_id, db)
    if not candidates:
        return _empty(query)

    catalog = [
        {"id": p.id, "title": p.title, "sku": p.sku,
         "description": (p.description or "")[:100],
         "attributes": p.attributes or {}}
        for p in candidates[:80]
    ]

    system = (
        "Ти — AI-асистент технічного каталогу промислового обладнання TI-Katalog. "
        "Спеціалізація: шланги, фітинги, насоси, манометри, ущільнення, промислова арматура. "
        "Відповідай ТІЛЬКИ валідним JSON без пояснень. "
        'Структура: {"matches":[{"id":1,"relevance":0.95,"reason":"..."}],'
        '"summary":"...","confidence":0.9} '
        "Максимум 10 результатів. Сортуй від найвищої до найнижчої релевантності."
    )
    user = (
        f'Запит: "{query}"\n\n'
        f"Каталог товарів:\n{json.dumps(catalog, ensure_ascii=False, indent=1)}\n\n"
        "Знайди найбільш релевантні товари. Враховуй технічні параметри (DN, PN, матеріал, різьба)."
    )

    headers = {
        "x-api-key": os.environ["ANTHROPIC_API_KEY"],
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-opus-4-5",
        "max_tokens": 1000,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }

    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers)
        r.raise_for_status()
    raw = r.json()["content"][0]["text"].strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    ai = json.loads(raw)

    by_id = {p.id: p for p in candidates}
    enriched = []
    for m in ai.get("matches", []):
        pid = m.get("id")
        if pid and pid in by_id:
            p = by_id[pid]
            slim = _product_slim(p)
            slim["relevance"] = m.get("relevance", 0.5)
            slim["reason"]    = m.get("reason", "")
            enriched.append(slim)

    return {
        "products": enriched[:limit],
        "total_candidates": len(candidates),
        "summary": ai.get("summary", ""),
        "confidence": ai.get("confidence", 0),
        "cached": False,
        "source": "ai",
    }


async def _pg_search(query: str, section_id, limit: int, db) -> dict:
    """PostgreSQL ILIKE fallback — always works, zero dependencies."""
    terms = query.strip().split()[:5]
    conditions = []
    for t in terms:
        p = f"%{t}%"
        conditions += [
            Product.title.ilike(p),
            Product.sku.ilike(p),
            Product.description.ilike(p),
        ]

    q = select(Product).options(selectinload(Product.images)).where(or_(*conditions))
    if section_id:
        q = q.where(Product.section_id == section_id)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar_one() or 0

    rows_r = await db.execute(q.order_by(Product.title).limit(limit))
    rows = rows_r.scalars().all()

    products = [
        {**_product_slim(p), "relevance": 0.7, "reason": "Повнотекстовий пошук PostgreSQL"}
        for p in rows
    ]

    return {
        "products": products,
        "total_candidates": total,
        "summary": f"Знайдено {len(products)} товарів за запитом «{query}» (PostgreSQL FTS)",
        "confidence": 0.6 if products else 0.0,
        "cached": False,
        "source": "pg_fts",
    }


def _empty(query: str) -> dict:
    return {
        "products": [], "total_candidates": 0,
        "summary": f"Каталог порожній або запит «{query}» не знайдено. Запустіть імпорт PDF.",
        "confidence": 0, "cached": False, "source": "empty",
    }
