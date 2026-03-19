"""
PDF Extractor — PyMuPDF for structure + Claude AI for Ukrainian technical data.
Claude extracts: title (UA), description (UA), attributes (Тиск/Діаметр/Матеріал/Різьба).
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


# ── Claude system prompt — forces Ukrainian output ────────────────────────────

UA_EXTRACTION_PROMPT = """Ти — система вилучення технічних даних для промислового каталогу TI-Katalog.
Твоя задача: отримати структуровані дані ВИКЛЮЧНО УКРАЇНСЬКОЮ МОВОЮ, навіть якщо вхідний текст на іншій мові (EN, DE, PL).

Відповідай ТІЛЬКИ валідним JSON масивом без пояснень:
[
  {
    "title": "Назва товару українською (макс. 100 символів)",
    "sku": "Артикул або null",
    "description": "Технічний опис товару українською (100-300 символів)",
    "attributes": {
      "Тиск": "значення (PN16, 16 bar, 232 PSI тощо) або null",
      "Діаметр": "значення (DN50, 50мм, 2 дюйми тощо) або null",
      "Матеріал": "значення (Сталь, Нержавійка, Гума, Латунь тощо) або null",
      "Різьба": "значення (BSP 1/2\", NPT, M12 тощо) або null",
      "Температура": "значення або null",
      "Довжина": "значення або null",
      "Стандарт": "значення або null"
    },
    "page_number": <номер сторінки>
  }
]

Правила:
- Якщо даних недостатньо для товару — не включай його
- Мінімум 2 поля attributes мають бути не null для включення
- Видаляй атрибути зі значенням null з фінального JSON
- Заголовок ЗАВЖДИ українською
- Якщо текст на EN: "Hydraulic hose" → "Гідравлічний шланг"
- Якщо текст на DE: "Druckschlauch" → "Напірний шланг"
"""


async def _claude_extract(page_text: str, page_num: int) -> List[Dict]:
    """Call Claude to extract Ukrainian technical data from page text."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or len(page_text.strip()) < 30:
        return []

    import httpx
    user = f"Сторінка {page_num}:\n\n{page_text[:3000]}"
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                json={
                    "model": "claude-opus-4-5",
                    "max_tokens": 1500,
                    "system": UA_EXTRACTION_PROMPT,
                    "messages": [{"role": "user", "content": user}],
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
        if isinstance(items, list):
            return items
    except Exception as e:
        logger.debug(f"Claude extract p{page_num}: {e}")
    return []


def _regex_sku(text: str) -> Optional[str]:
    patterns = [
        r"\b([A-Z]{1,4}[-_]?\d{3,12})\b",
        r"\bАрт[\.\s]*:?\s*([A-Z0-9\-]{4,20})\b",
        r"\bSKU[\s:]+([A-Z0-9\-]{4,20})\b",
        r"\b(\d{5,12})\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _regex_attrs(text: str) -> Dict[str, str]:
    """Fallback regex attribute extraction for when Claude is unavailable."""
    attrs: Dict[str, str] = {}
    checks = {
        "Тиск":       r"(?:PN|bar|PSI|MPa)\s*[\d\.]+|[\d\.]+\s*(?:bar|PSI|MPa|PN)",
        "Діаметр":    r"(?:DN|d=|Ø)\s*[\d\.]+|[\d\.]+\s*(?:мм|mm|дюйм|inch)",
        "Матеріал":   r"(?:Сталь|Steel|Нержав|Stainl|Гума|Rubber|Латунь|Brass|Поліамід|Polyamide)",
        "Різьба":     r"(?:BSP|NPT|BSPT|M\d+|G\d+|UNF)",
        "Температура":r"(?:-?\d+)\s*(?:°C|°F|C|F)",
        "Довжина":    r"L\s*=?\s*[\d\.]+\s*(?:мм|мм|cm|м|m)\b",
    }
    for name, pat in checks.items():
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            attrs[name] = m.group(0).strip()
    return attrs


# ── Main extraction ───────────────────────────────────────────────────────────

async def extract_products_from_pdf(
    pdf_bytes: bytes,
    document_id: int,
    section_id: Optional[int],
) -> List[Dict]:
    """Full pipeline: PDF parse → Claude AI → save to DB."""
    if not _FITZ:
        raise RuntimeError("PyMuPDF not installed — pip install pymupdf")

    from core.database import AsyncSessionLocal
    from models.models import Product, ProductImage, TextChunk

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise RuntimeError(f"Cannot open PDF: {e}")

    page_count = len(doc)
    saved_products = []
    use_claude = bool(os.getenv("ANTHROPIC_API_KEY"))

    async with AsyncSessionLocal() as db:
        for page_idx in range(page_count):
            try:
                page = doc[page_idx]
                page_num = page_idx + 1
                page_text = page.get_text("text").strip()

                if not page_text or len(page_text) < 20:
                    continue

                # Save raw text chunk
                db.add(TextChunk(
                    document_id=document_id,
                    text=page_text[:2000],
                    page_number=page_num,
                    block_type="page",
                ))

                # Extract images from this page
                page_images = []
                for img_info in page.get_images(full=True):
                    xref = img_info[0]
                    try:
                        bi = doc.extract_image(xref)
                        raw = bi["image"]
                        w = h = 0
                        if _PIL_OK:
                            pil = _PIL.open(io.BytesIO(raw))
                            if pil.width < 40 or pil.height < 40:
                                continue
                            w, h = pil.width, pil.height
                            buf = io.BytesIO()
                            pil.convert("RGB").save(buf, "PNG", optimize=True)
                            raw = buf.getvalue()
                        page_images.append({
                            "data_b64": base64.b64encode(raw).decode(),
                            "width": w, "height": h,
                        })
                    except Exception:
                        continue

                # ── AI extraction (Claude) or regex fallback ──────────────
                products_on_page = []
                if use_claude:
                    try:
                        products_on_page = await _claude_extract(page_text, page_num)
                        await asyncio.sleep(0.3)  # rate limit
                    except Exception as e:
                        logger.warning(f"Claude p{page_num}: {e}")

                if not products_on_page:
                    # Regex fallback: create one product per page
                    sku   = _regex_sku(page_text)
                    attrs = _regex_attrs(page_text)
                    title = page_text.split("\n")[0].strip()[:200]
                    if title and (sku or attrs):
                        products_on_page = [{
                            "title": title, "sku": sku,
                            "description": page_text[:300],
                            "attributes": attrs,
                            "page_number": page_num,
                        }]

                # ── Save products ─────────────────────────────────────────
                for pidx, item in enumerate(products_on_page):
                    if not item.get("title"):
                        continue
                    # Clean null attributes
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

                    # Attach first image to first product on page
                    if pidx == 0 and page_images:
                        img = page_images[0]
                        db.add(ProductImage(
                            product_id=prod.id,
                            image_data=img["data_b64"],
                            page_number=page_num,
                            width=img["width"],
                            height=img["height"],
                            is_primary=True,
                        ))

                    saved_products.append({"id": prod.id, "_page_count": page_count})

            except Exception as e:
                logger.warning(f"Page {page_idx + 1} error: {e}")
                continue

        await db.commit()

    doc.close()
    logger.info(f"Doc#{document_id}: {len(saved_products)} products from {page_count} pages")
    return saved_products
