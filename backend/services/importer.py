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

R2_BASE  = "https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev"
MANIFEST = f"{R2_BASE}/manifest.txt"

SECTIONS = {
    "manometr":  ("Манометри та датчики тиску",  "manometry"),
    "pressure":  ("Манометри та датчики тиску",  "manometry"),
    "hose":      ("Гідравлічні шланги",           "shlangy"),
    "hydraulic": ("Гідравлічні шланги",           "shlangy"),
    "shlang":    ("Гідравлічні шланги",           "shlangy"),
    "fitting":   ("Фітинги та з'єднання",         "fityingy"),
    "coupling":  ("Фітинги та з'єднання",         "fityingy"),
    "pump":      ("Насоси та насосні агрегати",   "nasosy"),
    "nasos":     ("Насоси та насосні агрегати",   "nasosy"),
    "seal":      ("Ущільнення та прокладки",      "ushchilnennya"),
    "gasket":    ("Ущільнення та прокладки",      "ushchilnennya"),
    "valve":     ("Клапани та засувки",           "klapany"),
    "zasuv":     ("Клапани та засувки",           "klapany"),
    "filter":    ("Фільтри та сепаратори",        "filtry"),
    "pipe":      ("Труби та трубопроводи",        "truby"),
    "truba":     ("Труби та трубопроводи",        "truby"),
    "cable":     ("Кабелі та електротехніка",     "kabeli"),
    "electric":  ("Кабелі та електротехніка",     "kabeli"),
    "sensor":    ("Датчики та автоматика",        "datchyky"),
    "tool":      ("Інструменти та оснащення",     "instrumenty"),
    "catalog":   ("Загальний каталог",            "zahalnyi"),
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
    """Main entry point — called from api/admin.py as background task."""
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
                r = await db.execute(
                    select(Document).where(Document.file_url == file_url)
                )
                if r.scalar_one_or_none():
                    # Already imported — skip silently
                    continue

                sec_name, sec_slug = _detect_section(fname)
                sec = await _get_or_create_section(db, sec_name, sec_slug)

                doc = Document(name=fname, file_url=file_url,
                               status="pending", section_id=sec.id)
                db.add(doc)
                await db.flush()

                db.add(ImportLog(
                    document_id=doc.id, document_name=fname,
                    status="success", message=f"Додано → розділ «{sec_name}»"
                ))
                new_ids.append(doc.id)
            except Exception as e:
                logger.error(f"Import error {fname}: {e}")
                db.add(ImportLog(
                    document_name=fname, status="error", message=str(e)[:400]
                ))

        await db.commit()
        logger.info(f"✅ Queued {len(new_ids)} new documents")

    # Parse sequentially in background (low memory mode for Railway free tier)
    for doc_id in new_ids:
        try:
            await parse_one(doc_id)
        except Exception as e:
            logger.error(f"parse_one({doc_id}) failed: {e}")
        await asyncio.sleep(0.5)


async def parse_one(doc_id: int):
    """Download + AI-parse one document and save products to DB."""
    from services.extractor import extract_products_from_pdf

    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_id)
        if not doc or doc.status in ("parsing", "done"):
            return

        doc.status = "parsing"
        await db.commit()

        async def _log(level: str, msg: str):
            db.add(ParseLog(document_id=doc_id, level=level, message=msg[:800]))

        try:
            await _log("info", f"📥 Завантаження: {doc.file_url}")
            await db.commit()

            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
                resp = await c.get(doc.file_url)
                resp.raise_for_status()
            pdf_bytes = resp.content

            await _log("info", f"📄 Завантажено {len(pdf_bytes):,} байт — парсинг…")
            await db.commit()

            products = await extract_products_from_pdf(pdf_bytes, doc.id, doc.section_id)

            await _log("info", f"✅ Збережено {len(products)} товарів")
            doc.status    = "done"
            doc.parsed_at = datetime.now(timezone.utc)
            if products:
                doc.page_count = products[0].get("_page_count", 0)
            await db.commit()
            logger.info(f"✅ Parsed doc#{doc_id} ({doc.name}): {len(products)} products")

        except Exception as e:
            logger.error(f"Parse error doc#{doc_id}: {e}")
            doc.status    = "error"
            doc.error_msg = str(e)[:400]
            await _log("error", f"Помилка: {e}")
            await db.commit()
