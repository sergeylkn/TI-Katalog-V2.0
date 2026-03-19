"""Products API."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.models import Product, TextChunk

router = APIRouter()


@router.get("/")
async def list_products(
    document_id: Optional[str] = None,
    section_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).options(selectinload(Product.images))
    if document_id:
        q = q.where(Product.document_id == uuid.UUID(document_id))
    if section_id:
        q = q.where(Product.section_id == uuid.UUID(section_id))
    if search:
        q = q.where(or_(
            Product.title.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%"),
        ))
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = (await db.scalars(q.order_by(Product.created_at.desc())
                              .offset((page - 1) * page_size).limit(page_size))).all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_prod(p) for p in rows]}


@router.get("/{prod_id}")
async def get_product(prod_id: str, db: AsyncSession = Depends(get_db)):
    p = await db.scalar(
        select(Product).where(Product.id == uuid.UUID(prod_id))
        .options(selectinload(Product.images))
    )
    if not p:
        raise HTTPException(404, "Товар не знайдено")
    return _prod(p, detail=True)


def _prod(p: Product, detail=False):
    primary = next((i for i in p.images if i.is_primary), None) or (p.images[0] if p.images else None)
    d = {
        "id": str(p.id), "document_id": str(p.document_id),
        "section_id": str(p.section_id) if p.section_id else None,
        "title": p.title, "sku": p.sku, "description": p.description,
        "attributes": p.attributes or {}, "page_number": p.page_number,
        "bbox": p.bbox, "primary_image": primary.image_data if primary else None,
        "created_at": p.created_at.isoformat(),
    }
    if detail:
        d["images"] = [
            {"id": str(i.id), "data": i.image_data, "page": i.page_number,
             "bbox": i.bbox, "width": i.width, "height": i.height, "is_primary": i.is_primary}
            for i in p.images
        ]
    return d
