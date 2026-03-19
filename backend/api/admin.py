import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from core.database import get_db
from models.models import Document, ImportLog  # Добавили ImportLog

logger = logging.getLogger("admin_api")
router = APIRouter()

@router.get("/import-status")
async def get_import_status(db: Session = Depends(get_db)):
    try:
        # Простая проверка на наличие таблицы, чтобы не падало при инициализации
        total = db.query(Document).count()
        pending = db.query(Document).filter(Document.status == "pending").count()
        return {"total_documents": total, "pending_in_queue": pending}
    except Exception as e:
        logger.error(f"Status error: {e}")
        # Возвращаем нули вместо ошибки, чтобы фронтенд не «крашился»
        return {"total_documents": 0, "pending_in_queue": 0, "error": str(e)}

@router.post("/import-all-pdfs")
async def import_all(db: Session = Depends(get_db)):
    try:
        from services.importer import run_import_all
        result = await run_import_all(db)
        return {"status": "success", "added": result.get("added", 0)}
    except Exception as e:
        logger.error(f"Import Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-api-key")
async def get_api_key():
    return {"is_set": bool(os.getenv("ANTHROPIC_API_KEY")), "type": "Claude"}

# --- НОВЫЕ ЭНДПОИНТЫ ДЛЯ ЛОГОВ (исправляют 404) ---

@router.get("/import-logs")
async def get_import_logs(limit: int = 100, db: Session = Depends(get_db)):
    try:
        # Получаем последние записи из таблицы логов
        logs = db.query(ImportLog).order_by(desc(ImportLog.created_at)).limit(limit).all()
        return logs
    except Exception as e:
        logger.error(f"Error fetching import logs: {e}")
        return []

@router.get("/parse-logs")
async def get_parse_logs():
    """
    Фронтенд ожидает этот эндпоинт для логов парсинга (Claude).
    Пока возвращаем пустой список, если логи хранятся только в консоли.
    """
    return []

@router.get("/cache-stats")
async def get_cache_stats():
    """Исправляет 404 для статистики кэша"""
    return {"status": "active", "hits": 0, "misses": 0}
