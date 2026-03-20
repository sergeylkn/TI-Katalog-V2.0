"""
PDF Extractor — lightweight edition.
NO images stored in DB. Only text products with attributes.
Uses Claude AI for Ukrainian extraction, regex fallback.
"""
import asyncio
import json
import logging
import os
import re
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

try:
    import fitz
    _FITZ = True
except ImportError:
    _FITZ = False

UA_PROMPT = """Витягни товари з технічного каталогу. Відповідай ТІЛЬКИ JSON масивом:
[{"title":"назва UA","sku":"артикул або null","description":"опис 50-200 символів UA","attributes":{"Тиск":"","Діаметр":"","Матеріал":"","Різьба":"","Температура":""},"page":1}]
Правила: назви українською, видаляй null атрибути, мін. 2 атрибути, якщо товарів немає → [].
"""


async def _ai_extract(text: str, page: int) -> List[Dict]:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key or len(text.strip()) < 40:
        return []
    try:
        import httpx
        async with httpx.AsyncClient(timeout=18) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 800,
                      "system": UA_PROMPT,
                      "messages": [{"role": "user", "content": f"Сторінка {page}:\n{text[:2000]}"}]},
            )
            r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        items = json.loads(raw)
        return items if isinstance(items, list) else []
    except Exception as e:
        logger.debug(f"AI p{page}: {e}")
        return []


def _regex_extract(text: str, page: int) -> List[Dict]:
    sku_m = re.search(r"\b([A-Z]{1,4}[-_]?\d{3,12})\b", text)
    sku = sku_m.group(1) if sku_m else None
    attrs = {}
    checks = {
        "Тиск":    r"(?:PN|bar|MPa|PSI)\s*[\d\.]+|[\d\.]+\s*(?:bar|MPa|PSI)",
        "Діаметр": r"(?:DN|Ø|d=)\s*[\d\.]+|[\d\.]+\s*(?:мм|mm)",
        "Матеріал":r"(?:Сталь|Steel|Нержав|Гума|Rubber|Латунь|Brass|Поліамід)",
        "Різьба":  r"(?:BSP|NPT|BSPT|M\d+|G\d+)",
    }
    for name, pat in checks.items():
        m = re.search(pat, text, re.I)
        if m:
            attrs[name] = m.group(0).strip()
    title = next((l.strip() for l in text.split("\n") if len(l.strip()) > 5), "")[:200]
    if title and (sku or len(attrs) >= 2):
        return [{"title": title, "sku": sku, "description": text[:300], "attributes": attrs, "page": page}]
    return []


async def extract_products(pdf_bytes: bytes, document_id: int, section_id: Optional[int]) -> Tuple[List, int]:
    if not _FITZ:
        raise RuntimeError("PyMuPDF not installed")

    from core.database import AsyncSessionLocal
    from models.models import Product

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)
    use_ai = bool(os.getenv("ANTHROPIC_API_KEY"))
    saved = []

    async with AsyncSessionLocal() as db:
        for idx in range(page_count):
            try:
                page = doc[idx]
                text = page.get_text("text").strip()
                if not text or len(text) < 20:
                    continue

                items = []
                if use_ai:
                    try:
                        items = await _ai_extract(text, idx + 1)
                        await asyncio.sleep(0.25)
                    except Exception:
                        pass

                if not items:
                    items = _regex_extract(text, idx + 1)

                for item in items:
                    if not item.get("title"):
                        continue
                    attrs = {k: v for k, v in (item.get("attributes") or {}).items() if v and v != "null"}
                    desc = (item.get("description") or "")[:600]
                    prod = Product(
                        document_id=document_id,
                        section_id=section_id,
                        title=item["title"][:512],
                        sku=item.get("sku"),
                        description=desc,
                        attributes=attrs,
                        page_number=item.get("page", idx + 1),
                    )
                    db.add(prod)
                    saved.append(prod)

            except Exception as e:
                logger.warning(f"Page {idx+1}: {e}")

        await db.commit()

    doc.close()
    return saved, page_count
