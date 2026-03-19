"""Fast PostgreSQL keyword search — no AI cost."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.models import Product

router = APIRouter()


@router.get("/quick")
async def quick_search(
    q: str = Query(..., min_length=1),
    section_id: Optional[str] = None,
    limit: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    terms = q.strip().split()[:5]
    conds = []
    for t in terms:
        p = f"%{t}%"
        conds += [Product.title.ilike(p), Product.sku.ilike(p), Product.description.ilike(p)]

    stmt = select(Product).options(selectinload(Product.images)).where(or_(*conds))
    if section_id:
        try:
            stmt = stmt.where(Product.section_id == uuid.UUID(section_id))
        except ValueError:
            pass

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = (await db.scalars(stmt.order_by(Product.title).limit(limit))).all()

    return {
        "items": [_slim(p) for p in rows],
        "total": total or 0,
    }


@router.get("/suggest")
async def suggest(
    q: str = Query(..., min_length=2),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    t = f"%{q.strip()}%"
    titles = (await db.scalars(
        select(Product.title).where(Product.title.ilike(t)).order_by(Product.title).limit(limit)
    )).all()
    skus = (await db.scalars(
        select(Product.sku).where(Product.sku.ilike(t)).where(Product.sku.isnot(None)).limit(limit // 2)
    )).all()
    suggestions = list(dict.fromkeys([x[:80] for x in titles] + list(skus)))[:limit]
    return {"suggestions": suggestions}


def _slim(p: Product):
    primary = next((i for i in p.images if i.is_primary), None) or (p.images[0] if p.images else None)
    return {
        "id": str(p.id), "title": p.title, "sku": p.sku,
        "description": (p.description or "")[:120],
        "attributes": p.attributes or {},
        "page_number": p.page_number,
        "document_id": str(p.document_id),
        "primary_image": primary.image_data if primary else None,
    }
