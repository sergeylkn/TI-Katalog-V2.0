"""Parser orchestrator — download → parse → store."""

import logging
from datetime import datetime, timezone

from core.database import AsyncSessionLocal
from models.models import Document, Product, ProductImage, TextChunk, ParseLog

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc)


async def _log(db, doc_id, level: str, msg: str):
    db.add(ParseLog(document_id=doc_id, level=level, message=msg[:800]))


async def parse_document(document_id: int):
    from parsers.pdf_parser import download_pdf, parse_pdf_bytes, detect_products
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, document_id)
        if not doc or doc.status == "parsing":
            return
        doc.status = "parsing"
        await db.commit()

        try:
            await _log(db, doc.id, "info", f"Завантаження: {doc.file_url}")
            await db.commit()

            import httpx
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
                resp = await c.get(doc.file_url)
                resp.raise_for_status()
            pdf_bytes = resp.content

            await _log(db, doc.id, "info", f"Завантажено {len(pdf_bytes):,} байт")
            await db.commit()

            text_blocks, image_blocks, page_count = parse_pdf_bytes(pdf_bytes)
            doc.page_count = page_count
            await _log(db, doc.id, "info",
                       f"Сторінок: {page_count} · Блоків: {len(text_blocks)} · Зображень: {len(image_blocks)}")
            await db.commit()

            for b in text_blocks:
                db.add(TextChunk(
                    document_id=doc.id, text=b.text, page_number=b.page,
                    bbox={"x0": b.x0, "y0": b.y0, "x1": b.x1, "y1": b.y1},
                    block_type=b.block_type,
                ))
            await db.flush()

            products = detect_products(text_blocks, image_blocks)
            await _log(db, doc.id, "info", f"Виявлено {len(products)} товарів")

            for p in products:
                try:
                    prod = Product(
                        document_id=doc.id, section_id=doc.section_id,
                        title=p.title, sku=p.sku, description=p.description,
                        attributes=p.attributes or {}, page_number=p.page, bbox=p.bbox,
                    )
                    db.add(prod)
                    await db.flush()
                    for idx, img in enumerate(p.images):
                        db.add(ProductImage(
                            product_id=prod.id, image_data=img.data_b64,
                            page_number=img.page,
                            bbox={"x0": img.x0, "y0": img.y0, "x1": img.x1, "y1": img.y1},
                            width=img.width, height=img.height, is_primary=(idx == 0),
                        ))
                except Exception as e:
                    logger.warning(f"Product save error: {e}")

            doc.status = "done"
            doc.parsed_at = _now()
            await db.commit()
            await _log(db, doc.id, "info", "✅ Парсинг завершено")
            await db.commit()
            logger.info(f"✅ {doc.name}: {len(products)} products")

        except Exception as e:
            logger.error(f"Parse error {document_id}: {e}")
            try:
                doc.status = "error"
                doc.error_msg = str(e)[:400]
                await _log(db, doc.id, "error", f"Помилка: {e}")
                await db.commit()
            except Exception:
                pass
