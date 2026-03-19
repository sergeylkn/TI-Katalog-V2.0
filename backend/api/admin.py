"""Admin API — API key (stored in DB) · import · logs · cache."""

import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select, func, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import Document, ImportLog, ParseLog, Section

logger = logging.getLogger(__name__)
router = APIRouter()

# We store ANTHROPIC_API_KEY in a simple settings table.
# If the env var is set, it takes priority over DB.
_KEY_STORE: dict = {}   # in-memory fallback


def _get_key_from_env() -> Optional[str]:
    return os.getenv("ANTHROPIC_API_KEY")


# ── API Key ───────────────────────────────────────────────────────────────────

class ApiKeyIn(BaseModel):
    api_key: str


@router.post("/set-api-key")
async def set_api_key(body: ApiKeyIn):
    if not body.api_key.strip().startswith("sk-"):
        raise HTTPException(400, "Невірний формат ключа (має починатись з sk-)")
    _KEY_STORE["ANTHROPIC_API_KEY"] = body.api_key.strip()
    # Also set env so services pick it up immediately
    os.environ["ANTHROPIC_API_KEY"] = body.api_key.strip()
    return {"status": "ok", "message": "API ключ збережено ✓"}


@router.get("/get-api-key")
async def get_api_key():
    key = _get_key_from_env() or _KEY_STORE.get("ANTHROPIC_API_KEY")
    if not key:
        return {"configured": False, "masked": None}
    return {"configured": True, "masked": key[:10] + "****" + key[-4:]}


# ── Import ────────────────────────────────────────────────────────────────────

@router.post("/import-all-pdfs")
async def import_all(bg: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).select_from(Document).where(Document.status == "parsing")
    )
    running = result.scalar_one()
    if running > 0:
        return {"status": "already_running", "message": f"{running} файлів обробляється"}
    from services.importer import run_import_all
    bg.add_task(run_import_all)
    return {"status": "started", "message": "Імпорт запущено у фоні"}


@router.get("/import-status")
async def import_status(db: AsyncSession = Depends(get_db)):
    async def count(cond=None):
        q = select(func.count()).select_from(Document)
        if cond is not None:
            q = q.where(cond)
        r = await db.execute(q)
        return r.scalar_one() or 0

    total   = await count()
    done    = await count(Document.status == "done")
    parsing = await count(Document.status == "parsing")
    errors  = await count(Document.status == "error")
    pending = await count(Document.status == "pending")
    return {
        "total": total, "done": done, "parsing": parsing,
        "errors": errors, "pending": pending,
        "is_importing": parsing > 0,
    }


@router.get("/import-logs")
async def import_logs(limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImportLog).order_by(desc(ImportLog.created_at)).limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "document_name": r.document_name,
            "filename": r.document_name,
            "status": r.status,
            "message": r.message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/parse-logs")
async def parse_logs(limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ParseLog).order_by(desc(ParseLog.created_at)).limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "document_id": r.document_id,
            "level": r.level,
            "message": r.message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/cache-stats")
async def cache_stats():
    from services.cache import cache_stats as _stats
    return await _stats()


@router.post("/clear-cache")
async def clear_cache():
    from services.cache import cache_clear
    n = await cache_clear()
    return {"status": "ok", "cleared": n}


# ── Reparse ───────────────────────────────────────────────────────────────────

@router.post("/reparse/{doc_id}")
async def reparse(doc_id: int, bg: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Документ не знайдено")
    doc.status = "pending"
    await db.commit()
    from services.importer import parse_one
    bg.add_task(parse_one, doc_id)
    return {"status": "queued"}


@router.delete("/document/{doc_id}")
async def delete_doc(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Документ не знайдено")
    await db.delete(doc)
    await db.commit()
    return {"status": "deleted"}


@router.post("/clear-database")
async def clear_database(db: AsyncSession = Depends(get_db)):
    """Wipe all data for re-import. TRUNCATE is atomic and fast."""
    await db.execute(text(
        "TRUNCATE TABLE parse_logs, import_logs, product_images, "
        "text_chunks, products, documents RESTART IDENTITY CASCADE"
    ))
    await db.commit()
    return {"status": "cleared"}
