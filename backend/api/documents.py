"""Documents & Sections API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.models import Document, Section

router = APIRouter()


@router.get("/sections")
async def get_sections(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Section).order_by(Section.name))
    secs = r.scalars().all()
    result = []
    for s in secs:
        cnt = (await db.execute(
            select(func.count()).select_from(Document).where(Document.section_id == s.id)
        )).scalar_one()
        result.append({"id": s.id, "name": s.name, "slug": s.slug, "document_count": cnt})
    return result


@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Document).order_by(Document.created_at.desc()).limit(200))
    docs = r.scalars().all()
    return [_doc(d) for d in docs]


@router.get("/{doc_id}")
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    d = await db.get(Document, doc_id)
    if not d:
        raise HTTPException(404, "Not found")
    return _doc(d)


def _doc(d: Document):
    return {
        "id": d.id, "name": d.name, "file_url": d.file_url,
        "status": d.status, "section_id": d.section_id,
        "page_count": d.page_count, "error_msg": d.error_msg,
        "parsed_at": d.parsed_at.isoformat() if d.parsed_at else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }
