import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import Document, Section

logger = logging.getLogger("documents_api")
router = APIRouter()

@router.get("/sections")
async def list_sections(db: AsyncSession = Depends(get_db)):
    """Получение списка всех секций с количеством документов."""
    try:
        # 1. Получаем все секции
        # В асинхронном режиме мы ожидаем только сам execute
        stmt = select(Section).order_by(Section.name)
        execution_result = await db.execute(stmt)
        
        # scalars() и all() вызываются СИНХРОННО у объекта результата
        secs = execution_result.scalars().all()
        
        output = []
        for s in secs:
            # 2. Считаем количество документов для каждой секции
            count_stmt = select(func.count()).select_from(Document).where(Document.section_id == s.id)
            count_execution = await db.execute(count_stmt)
            
            # Извлекаем значение через scalar_one() синхронно
            cnt = count_execution.scalar_one()
            
            output.append({
                "id": s.id, 
                "name": s.name, 
                "document_count": cnt or 0
            })
        return output
    except Exception as e:
        logger.error(f"Error in list_sections: {e}")
        # Возвращаем пустой список, чтобы фронтенд не падал
        return []

@router.get("/")
async def list_documents(
    section_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Список документов с фильтрацией и пагинацией."""
    try:
        q = select(Document)
        
        if section_id:
            q = q.where(Document.section_id == section_id)
        if status:
            q = q.where(Document.status == status)
        
        # Получаем total
        count_stmt = select(func.count()).select_from(q.subquery())
        count_execution = await db.execute(count_stmt)
        total = count_execution.scalar_one()
        
        # Получаем строки
        rows_stmt = q.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        rows_execution = await db.execute(rows_stmt)
        rows = rows_execution.scalars().all()
        
        return {
            "total": total, 
            "page": page, 
            "page_size": page_size,
            "items": [_doc(d) for d in rows]
        }
    except Exception as e:
        logger.error(f"Error in list_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{doc_id}")
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Деталка документа."""
    try:
        doc = await db.get(Document, doc_id)
        if not doc:
            raise HTTPException(404, "Документ не знайдено")
        return _doc(doc)
    except Exception as e:
        logger.error(f"Error in get_document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _doc(d: Document):
    return {
        "id": d.id,
        "name": d.name,
        "file_url": d.file_url,
        "section_id": d.section_id,
        "status": d.status,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }
