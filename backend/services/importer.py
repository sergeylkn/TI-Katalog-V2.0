"""R2 Importer — manifest → sections → documents → parse queue."""
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
    "manometr": ("Манометри та датчики тиску", "manometry"),
    "pressure": ("Манометри та датчики тиску", "manometry"),
    "hose":     ("Гідравлічні шланги",          "shlangy"),
    "shlang":   ("Гідравлічні шланги",          "shlangy"),
    "hydraulic":("Гідравлічні шланги",          "shlangy"),
    "fitting":  ("Фітинги та з'єднання",        "fityingy"),
    "coupling": ("Фітинги та з'єднання",        "fityingy"),
    "pump":     ("Насоси та насосні агрегати",  "nasosy"),
    "nasos":    ("Насоси та насосні агрегати",  "nasosy"),
    "seal":     ("Ущільнення та прокладки",     "ushchilnennya"),
    "gasket":   ("Ущільнення та прокладки",     "ushchilnennya"),
    "valve":    ("Клапани та засувки",          "klapany"),
    "filter":   ("Фільтри та сепаратори",       "filtry"),
    "pipe":     ("Труби та трубопроводи",       "truby"),
    "truba":    ("Труби та трубопроводи",       "truby"),
    "cable":    ("Кабелі та електротехніка",    "kabeli"),
    "sensor":   ("Датчики та автоматика",       "datchyky"),
    "tool":     ("Інструменти та оснащення",    "instrumenty"),
}
DEFAULT_SECTION = ("Загальний каталог", "zahalnyi")


def _detect_section(filename: str):
    low = filename.lower()
    for kw, val in SECTIONS.items():
        if kw in low:
            return val
    return DEFAULT_SECTION


async def _get_or_create_section(db, name: str, slug: str) -> Section:
    r = await db.execute(select(Section).where(Section.slug == slug))
    sec = r.scalar_one_or_none()
    if not sec:
        sec = Section(name=name, slug=slug)
        db.add(sec)
        await db.flush()
    return sec


async def run_import_all():
    logger.info("🔄 R2 import starting…")
    async with AsyncSessionLocal() as db:
        try:
            async with httpx.AsyncClient(timeout=30) as c:
                resp = await c.get(MANIFEST)
                resp.raise_for_status()
            files = [l.strip() for l in resp.text.splitlines() if l.strip().lower().endswith(".pdf")]
            logger.info(f"Manifest: {len(files)} PDFs")
        except Exception as e:
            db.add(ImportLog(document_name="manifest.txt", status="error", message=str(e)[:400]))
            await db.commit()
            return

        new_ids = []
        for fname in files:
            url = f"{R2_BASE}/{fname}"
            r = await db.execute(select(Document).where(Document.file_url == url))
            if r.scalar_one_or_none():
                continue
            sec_name, sec_slug = _detect_section(fname)
            sec = await _get_or_create_section(db, sec_name, sec_slug)
            doc = Document(name=fname, file_url=url, status="pending", section_id=sec.id)
            db.add(doc)
            await db.flush()
            db.add(ImportLog(document_id=doc.id, document_name=fname, status="success",
                             message=f"→ {sec_name}"))
            new_ids.append(doc.id)

        await db.commit()
        logger.info(f"✅ Queued {len(new_ids)} documents")

    for doc_id in new_ids:
        try:
            await parse_one(doc_id)
        except Exception as e:
            logger.error(f"parse_one({doc_id}): {e}")
        await asyncio.sleep(0.5)


async def parse_one(doc_id: int):
    from services.extractor import extract_products
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_id)
        if not doc or doc.status in ("parsing", "done"):
            return
        doc.status = "parsing"
        await db.commit()

        async def _log(level, msg):
            db.add(ParseLog(document_id=doc_id, level=level, message=msg[:400]))

        try:
            await _log("info", f"📥 {doc.file_url}")
            await db.commit()

            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
                resp = await c.get(doc.file_url)
                resp.raise_for_status()

            products, page_count = await extract_products(resp.content, doc.id, doc.section_id)

            doc.status = "done"
            doc.page_count = page_count
            doc.parsed_at = datetime.now(timezone.utc)
            await _log("info", f"✅ {len(products)} товарів, {page_count} сторінок")
            await db.commit()
            logger.info(f"✅ doc#{doc_id} ({doc.name}): {len(products)} products")

        except Exception as e:
            logger.error(f"parse error doc#{doc_id}: {e}")
            doc.status = "error"
            doc.error_msg = str(e)[:400]
            await _log("error", str(e)[:400])
            await db.commit()
