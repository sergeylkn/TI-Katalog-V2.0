"""
R2 Importer — reads manifest.txt, auto-assigns technical sections,
triggers AI-powered parsing for each PDF.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.models import Document, Section, ImportLog, ParseLog

logger = logging.getLogger(__name__)

R2_BASE = "https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev"
MANIFEST = f"{R2_BASE}/manifest.txt"

SECTIONS = {
    "manometr":  ("Манометри та датчики тиску",  "manometry"),
    "pressure":  ("Манометри та датчики тиску",  "manometry"),
    "hose":      ("Гідравлічні шланги",           "shlangy"),
    "hydraulic": ("Гідравлічні шланги",           "shlangy"),
    "fitting":   ("Фітинги та з'єднання",         "fityingy"),
    "coupling":  ("Фітинги та з'єднання",         "fityingy"),
    "pump":      ("Насоси та насосні агрегати",   "nasosy"),
    "seal":      ("Ущільнення та прокладки",      "ushchilnennya"),
    "gasket":    ("Ущільнення та прокладки",      "ushchilnennya"),
    "valve":     ("Клапани та засувки",           "klapany"),
    "filter":    ("Фільтри та сепаратори",        "filtry"),
    "pipe":      ("Труби та трубопроводи",        "truby"),
    "cable":     ("Кабелі та електротехніка",     "kabeli"),
    "sensor":    ("Датчики та автоматика",        "datchyky"),
    "tool":      ("Інструменти та оснащення",     "instrumenty"),
}
DEFAULT_SECTION = ("Загальний каталог", "zahalnyi")


def _detect_section(filename: str):
    low = filename.lower()
    for keyword, (name, slug) in SECTIONS.items():
        if keyword in low:
            return name, slug
    return DEFAULT_SECTION


async def _get_or_create_section(db, name: str, slug: str) -> Section:
    r = await db.execute(select(Section).where(Section.slug == slug))
    sec = r.scalar_one_or_none()
    if sec:
        return sec
    sec = Section(name=name, slug=slug)
    db.add(sec)
    await db.flush()
    return sec


async def run_import_all():
    logger.info("🔄 Starting R2 import from manifest")
    async with AsyncSessionLocal() as db:
        try:
            async with httpx.AsyncClient(timeout=30) as c:
                resp = await c.get(MANIFEST)
                resp.raise_for_status()
            filenames = [
                ln.strip() for ln in resp.text.splitlines()
                if ln.strip() and ln.strip().lower().endswith(".pdf")
            ]
            logger.info(f"Manifest: {len(filenames)} PDFs")
        except Exception as e:
            logger.error(f"Manifest fetch failed: {e}")
            db.add(ImportLog(document_name="manifest.txt", status="error",
                             message=f"Manifest fetch failed: {e}"))
            await db.commit()
            return

        new_ids = []
        for fname in filenames:
            try:
                file_url = f"{R2_BASE}/{fname}"
                r = await db.execute(select(Document).where(Document.file_url == file_url))
                if r.scalar_one_or_none():
                    continue

                sec_name, sec_slug = _detect_section(fname)
                sec = await _get_or_create_section(db, sec_name, sec_slug)
                doc = Document(name=fname, file_url=file_url,
                               status="pending", section_id=sec.id)
                db.add(doc)
                await db.flush()
                db.add(ImportLog(document_id=doc.id, document_name=fname,
                                 status="success", message=f"Розділ: {sec_name}"))
                new_ids.append(doc.id)
            except Exception as e:
                logger.error(f"Import error {fname}: {e}")
                db.add(ImportLog(document_name=fname, status="error", message=str(e)[:400]))

        await db.commit()
        logger.info(f"✅ Queued {len(new_ids)} new documents")

    from services.parser import parse_document
    for doc_id in new_ids:
        await parse_document(doc_id)
        await asyncio.sleep(0.3)


async def parse_one(doc_id: int):
    from services.parser import parse_document
    await parse_document(doc_id)
