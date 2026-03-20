"""Products API — no image blobs, PDF deep links instead."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.models import Product, Document, Section

router = APIRouter()


async def _resolve_section(ref: str, db: AsyncSession) -> Optional[int]:
    try:
        return int(ref)
    except ValueError:
        r = await db.execute(select(Section).where(Section.slug == ref))
        s = r.scalar_one_or_none()
        return s.id if s else None


@router.get("/")
async def list_products(
    document_id: Optional[int] = None,
    section_id:  Optional[int] = None,
    search:      Optional[str] = None,
    page:        int = Query(1, ge=1),
    page_size:   int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product)
    if document_id:
        q = q.where(Product.document_id == document_id)
    if section_id:
        q = q.where(Product.section_id == section_id)
    if search:
        t = f"%{search}%"
        q = q.where(or_(Product.title.ilike(t), Product.sku.ilike(t), Product.description.ilike(t)))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one() or 0
    rows  = (await db.execute(q.order_by(desc(Product.created_at)).offset((page-1)*page_size).limit(page_size))).scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_prod(p) for p in rows]}


@router.get("/section/{section_ref}")
async def by_section(
    section_ref: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    sid = await _resolve_section(section_ref, db)
    if sid is None:
        raise HTTPException(404, f"Section '{section_ref}' not found")
    q = select(Product).where(Product.section_id == sid)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one() or 0
    rows  = (await db.execute(q.order_by(Product.title).offset((page-1)*page_size).limit(page_size))).scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_prod(p) for p in rows]}


@router.get("/{prod_id}/recommendations")
async def recommendations(prod_id: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, prod_id)
    if not p:
        raise HTTPException(404, "Not found")
    r = await db.execute(
        select(Product).where(Product.section_id == p.section_id, Product.id != prod_id).limit(6)
    )
    return {"recommendations": [{**_prod(x), "reason": "Схожий товар"} for x in r.scalars().all()]}


@router.get("/{prod_id}")
async def get_product(prod_id: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, prod_id)
    if not p:
        raise HTTPException(404, "Not found")
    doc = await db.get(Document, p.document_id)
    result = _prod(p, detail=True)
    if doc:
        base = doc.file_url or ""
        result["document_url"] = f"{base}#page={p.page_number}" if p.page_number else base
        result["original_url"] = doc.file_url
    return result


def _prod(p: Product, detail=False):
    d = {
        "id": p.id,
        "document_id": p.document_id,
        "section_id": p.section_id,
        "title": p.title,
        "sku": p.sku,
        "description": p.description,
        "attributes": p.attributes or {},
        "page_number": p.page_number,
        "primary_image": None,   # no DB images — frontend shows PDF viewer
        "document_url": None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    return d
