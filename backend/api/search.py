"""AI semantic search via Claude with PDF references."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.models import Product
from services.claude import ai_search
from services.cache import cache_get, cache_set

router = APIRouter()

@router.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    section_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    q = q.strip()

    cached = await cache_get(q, section_id)
    if cached:
        return {**cached, "cached": True}

    # Подгружаем связанные документы сразу
    stmt = select(Product).options(selectinload(Product.document))
    if section_id:
        try:
            stmt = stmt.where(Product.section_id == uuid.UUID(section_id))
        except ValueError:
            pass
    
    stmt = stmt.limit(200)
    products = (await db.execute(stmt)).scalars().all()

    if not products:
        return {"products": [], "matches": [], "confidence": 0,
                "summary": "Каталог порожній", "total_candidates": 0, "cached": False}

    catalog = [
        {"id": str(p.id), "title": p.title, "sku": p.sku,
         "description": (p.description or "")[:120], "attributes": p.attributes or {}}
        for p in products
    ]

    try:
        ai = await ai_search(q, catalog, db)
    except Exception as e:
        raise HTTPException(500, f"AI помилка: {e}")

    by_id = {str(p.id): p for p in products}
    enriched = []
    
    for m in ai.get("matches", []):
        pid = m.get("id")
        if pid and pid in by_id:
            p = by_id[pid]
            enriched.append({
                "id": str(p.id),
                "title": p.title,
                "sku": p.sku,
                "description": p.description,
                "attributes": p.attributes or {},
                "page_number": p.page_number,
                "bbox": p.bbox,
                "document_id": str(p.document_id),
                "document_url": p.document.file_url if p.document else None,
                "relevance": m.get("relevance", 0.5),
                "reason": m.get("reason", ""),
            })

    result = {
        "products": enriched[:limit],
        "matches": ai.get("matches", []),
        "confidence": ai.get("confidence", 0),
        "summary": ai.get("summary", ""),
        "total_candidates": len(products),
        "cached": False,
    }
    await cache_set(q, result, section_id)
    return result
