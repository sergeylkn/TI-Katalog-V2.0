"""Documents + Sections API — Integer IDs, correct async SQLAlchemy."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import Document, Section

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sections")
async def list_sections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).order_by(Section.name))
    secs = result.scalars().all()
    output = []
    for s in secs:
        cnt_r = await db.execute(
            select(func.count()).select_from(Document).where(Document.section_id == s.id)
        )
        cnt = cnt_r.scalar_one() or 0
        output.append({
            "id": s.id, "name": s.name, "slug": s.slug,
            "description": s.description, "document_count": cnt,
        })
    return output


@router.get("/")
async def list_documents(
    section_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(Document)
    if section_id:
        q = q.where(Document.section_id == section_id)
    if status:
        q = q.where(Document.status == status)
    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar_one() or 0
    rows_r = await db.execute(
        q.order_by(desc(Document.created_at))
        .offset((page - 1) * page_size).limit(page_size)
    )
    rows = rows_r.scalars().all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_doc(d) for d in rows]}


@router.get("/{doc_id}")
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Документ не знайдено")
    return _doc(doc, detail=True)


def _doc(d: Document, detail=False):
    base = {
        "id": d.id, "name": d.name, "filename": d.name,
        "file_url": d.file_url, "original_url": d.file_url,
        "section_id": d.section_id, "status": d.status,
        "page_count": d.page_count,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "parsed_at": d.parsed_at.isoformat() if d.parsed_at else None,
    }
    if detail:
        base["error_msg"] = d.error_msg
    return base
