"""Products API — Integer IDs, accepts both int and slug for section."""

import logging
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.models import Product, ProductImage, Document, Section

logger = logging.getLogger(__name__)
router = APIRouter()


async def _resolve_section_id(section_ref: str, db: AsyncSession) -> Optional[int]:
    """Accept integer ID or slug string."""
    try:
        return int(section_ref)
    except ValueError:
        # It's a slug — look it up
        r = await db.execute(select(Section).where(Section.slug == section_ref))
        sec = r.scalar_one_or_none()
        return sec.id if sec else None


@router.get("/")
async def list_products(
    document_id: Optional[int] = None,
    section_id:  Optional[int] = None,
    search:      Optional[str] = None,
    page:        int = Query(1, ge=1),
    page_size:   int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).options(selectinload(Product.images))
    if document_id:
        q = q.where(Product.document_id == document_id)
    if section_id:
        q = q.where(Product.section_id == section_id)
    if search:
        t = f"%{search}%"
        q = q.where(or_(
            Product.title.ilike(t),
            Product.sku.ilike(t),
            Product.description.ilike(t),
        ))
    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total   = total_r.scalar_one() or 0
    rows_r  = await db.execute(
        q.order_by(desc(Product.created_at))
        .offset((page - 1) * page_size).limit(page_size)
    )
    rows = rows_r.scalars().all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_prod(p) for p in rows]}


@router.get("/section/{section_ref}")
async def products_by_section(
    section_ref: str,           # accepts "42" (int) or "shlangy" (slug)
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    sid = await _resolve_section_id(section_ref, db)
    if sid is None:
        raise HTTPException(404, f"Розділ '{section_ref}' не знайдено")
    q = select(Product).options(selectinload(Product.images)).where(
        Product.section_id == sid
    )
    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar_one() or 0
    rows_r = await db.execute(
        q.order_by(Product.title).offset((page - 1) * page_size).limit(page_size)
    )
    rows = rows_r.scalars().all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_prod(p) for p in rows]}


@router.get("/{prod_id}/recommendations")
async def recommendations(prod_id: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, prod_id)
    if not p:
        raise HTTPException(404, "Товар не знайдено")
    r = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.section_id == p.section_id, Product.id != prod_id)
        .limit(6)
    )
    recs = r.scalars().all()
    return {"recommendations": [
        {**_prod(x), "reason": "Схожий товар з того ж розділу"}
        for x in recs
    ]}


@router.get("/{prod_id}")
async def get_product(prod_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(Product).where(Product.id == prod_id)
        .options(selectinload(Product.images))
    )
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Товар не знайдено")

    # Fetch document for deep PDF link
    doc = await db.get(Document, p.document_id)
    doc_url = None
    if doc:
        base = doc.file_url or ""
        doc_url = f"{base}#page={p.page_number}" if p.page_number else base

    result = _prod(p, detail=True)
    result["document_url"] = doc_url
    return result


def _prod(p: Product, detail=False):
    imgs = p.images if hasattr(p, "images") and p.images else []
    primary = next((i for i in imgs if i.is_primary), imgs[0] if imgs else None)
    d: dict = {
        "id": p.id,
        "document_id": p.document_id,
        "section_id": p.section_id,
        "title": p.title,
        "sku": p.sku,
        "description": p.description,
        "attributes": p.attributes or {},
        "page_number": p.page_number,
        "bbox": p.bbox,
        "primary_image": primary.image_data if primary else None,
        "document_url": None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    if detail:
        d["images"] = [
            {"id": i.id, "data": i.image_data, "page": i.page_number,
             "bbox": i.bbox, "width": i.width, "height": i.height,
             "is_primary": i.is_primary}
            for i in imgs
        ]
    return d
