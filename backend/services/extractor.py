"""
PDF Extractor — PyMuPDF + Claude AI Ukrainian extraction.
IMPORTANT: Images stored as base64 only if < 50KB and only 1 per product.
This prevents database disk overflow on Railway free tier.
"""

import asyncio
import base64
import io
import json
import logging
import os
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    import fitz
    _FITZ = True
except ImportError:
    _FITZ = False
    logger.warning("PyMuPDF not installed")

try:
    from PIL import Image as _PIL
    _PIL_OK = True
except ImportError:
    _PIL_OK = False

# Max image size to store in DB (bytes of base64). ~50KB raw = ~67KB base64
MAX_IMAGE_BYTES = 50_000
# Max images to store per document (not per product — just 1 total for preview)
MAX_IMAGES_PER_DOC = 5

UA_EXTRACTION_PROMPT = """Ти — система вилучення технічних даних для промислового каталогу TI-Katalog.
Відповідай ТІЛЬКИ валідним JSON масивом без пояснень:
[
  {
    "title": "Назва товару українською (макс. 100 символів)",
    "sku": "Артикул або null",
    "description": "Технічний опис товару українською (100-300 символів)",
    "attributes": {
      "Тиск": "значення або null",
      "Діаметр": "значення або null",
      "Матеріал": "значення або null",
      "Різьба": "значення або null",
      "Температура": "значення або null",
      "Довжина": "значення або null",
      "Стандарт": "значення або null"
    },
    "page_number": <номер сторінки>
  }
]
Правила:
- Мінімум 2 non-null атрибути для включення товару
- Видаляй null атрибути з JSON
- Назва ЗАВЖДИ українською (EN/DE → переклад)
- Якщо на сторінці немає технічних товарів — поверни []
"""


async def _claude_extract(page_text: str, page_num: int) -> List[Dict]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or len(page_text.strip()) < 30:
        return []
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                json={
                    "model": "claude-opus-4-5",
                    "max_tokens": 1500,
                    "system": UA_EXTRACTION_PROMPT,
                    "messages": [{"role": "user", "content": f"Сторінка {page_num}:\n\n{page_text[:3000]}"}],
                },
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
            )
            r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        items = json.loads(raw)
        return items if isinstance(items, list) else []
    except Exception as e:
        logger.debug(f"Claude extract p{page_num}: {e}")
        return []


def _regex_sku(text: str) -> Optional[str]:
    for pat in [r"\b([A-Z]{1,4}[-_]?\d{3,12})\b", r"\b(\d{6,12})\b"]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _regex_attrs(text: str) -> Dict[str, str]:
    attrs: Dict[str, str] = {}
    checks = {
        "Тиск":       r"(?:PN|bar|PSI|MPa)\s*[\d\.]+|[\d\.]+\s*(?:bar|PSI|MPa)",
        "Діаметр":    r"(?:DN|d=|Ø)\s*[\d\.]+|[\d\.]+\s*(?:мм|mm)",
        "Матеріал":   r"(?:Сталь|Steel|Нержав|Stainl|Гума|Rubber|Латунь|Brass|Поліамід)",
        "Різьба":     r"(?:BSP|NPT|BSPT|M\d+|G\d+)",
        "Температура":r"(?:-?\d+)\s*°[CF]",
    }
    for name, pat in checks.items():
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            attrs[name] = m.group(0).strip()
    return attrs


def _compress_image(raw_bytes: bytes, max_bytes: int = MAX_IMAGE_BYTES) -> Optional[str]:
    """Compress image and return base64 only if small enough."""
    if not _PIL_OK:
        b64 = base64.b64encode(raw_bytes).decode()
        return b64 if len(b64) < max_bytes * 1.4 else None
    try:
        pil = _PIL.open(io.BytesIO(raw_bytes))
        if pil.width < 60 or pil.height < 60:
            return None
        # Resize if too large
        if pil.width > 400 or pil.height > 400:
            pil.thumbnail((400, 400), _PIL.LANCZOS)
        buf = io.BytesIO()
        pil.convert("RGB").save(buf, "JPEG", quality=60, optimize=True)
        compressed = buf.getvalue()
        b64 = base64.b64encode(compressed).decode()
        return b64 if len(b64) < max_bytes * 1.4 else None
    except Exception:
        return None


async def extract_products_from_pdf(
    pdf_bytes: bytes,
    document_id: int,
    section_id: Optional[int],
) -> List[Dict]:
    if not _FITZ:
        raise RuntimeError("PyMuPDF not installed")

    from core.database import AsyncSessionLocal
    from models.models import Product, ProductImage, TextChunk

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise RuntimeError(f"Cannot open PDF: {e}")

    page_count = len(doc)
    saved_products = []
    use_claude = bool(os.getenv("ANTHROPIC_API_KEY"))
    images_stored = 0  # Track total images stored for this document

    async with AsyncSessionLocal() as db:
        for page_idx in range(page_count):
            try:
                page = doc[page_idx]
                page_num = page_idx + 1
                page_text = page.get_text("text").strip()

                if not page_text or len(page_text) < 20:
                    continue

                # Store text chunk (no images in text_chunks — saves space)
                db.add(TextChunk(
                    document_id=document_id,
                    text=page_text[:2000],
                    page_number=page_num,
                    block_type="page",
                ))

                # Extract ONE small image per page (if under limit)
                page_image_b64: Optional[str] = None
                if images_stored < MAX_IMAGES_PER_DOC:
                    for img_info in page.get_images(full=True)[:3]:  # Try first 3
                        xref = img_info[0]
                        try:
                            bi = doc.extract_image(xref)
                            compressed = _compress_image(bi["image"])
                            if compressed:
                                page_image_b64 = compressed
                                images_stored += 1
                                break
                        except Exception:
                            continue

                # AI or regex extraction
                products_on_page = []
                if use_claude:
                    try:
                        products_on_page = await _claude_extract(page_text, page_num)
                        await asyncio.sleep(0.3)
                    except Exception as e:
                        logger.warning(f"Claude p{page_num}: {e}")

                if not products_on_page:
                    sku = _regex_sku(page_text)
                    attrs = _regex_attrs(page_text)
                    title = page_text.split("\n")[0].strip()[:200]
                    if title and (sku or len(attrs) >= 2):
                        products_on_page = [{
                            "title": title, "sku": sku,
                            "description": page_text[:300],
                            "attributes": attrs,
                            "page_number": page_num,
                        }]

                # Save products — only attach image to FIRST product on page
                for pidx, item in enumerate(products_on_page):
                    if not item.get("title"):
                        continue
                    attrs_clean = {
                        k: v for k, v in (item.get("attributes") or {}).items()
                        if v and v != "null"
                    }
                    prod = Product(
                        document_id=document_id,
                        section_id=section_id,
                        title=item["title"][:512],
                        sku=item.get("sku"),
                        description=item.get("description"),
                        attributes=attrs_clean,
                        page_number=item.get("page_number", page_num),
                        bbox=None,
                    )
                    db.add(prod)
                    await db.flush()

                    # Attach image only to first product on first pages
                    if pidx == 0 and page_image_b64:
                        db.add(ProductImage(
                            product_id=prod.id,
                            image_data=page_image_b64,
                            page_number=page_num,
                            is_primary=True,
                        ))
                        page_image_b64 = None  # Use each image only once

                    saved_products.append({"id": prod.id, "_page_count": page_count})

            except Exception as e:
                logger.warning(f"Page {page_idx + 1} error: {e}")
                continue

        await db.commit()

    doc.close()
    logger.info(f"Doc#{document_id}: {len(saved_products)} products, {images_stored} images stored")
    return saved_products
