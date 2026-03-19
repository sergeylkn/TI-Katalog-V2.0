"""PDF parser — PyMuPDF + Pillow. Improved for industrial catalogs and tables."""

import asyncio, base64, io, logging, re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple

import httpx

logger = logging.getLogger(__name__)

try:
    import fitz
    _FITZ = True
except ImportError:
    _FITZ = False
    logger.warning("PyMuPDF not installed — pip install pymupdf")

try:
    from PIL import Image as _PIL
    _PIL_OK = True
except ImportError:
    _PIL_OK = False


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class TextBlock:
    text: str; page: int
    x0: float; y0: float; x1: float; y1: float
    block_type: str = "text"

@dataclass
class ImageBlock:
    page: int
    x0: float; y0: float; x1: float; y1: float
    width: int; height: int; data_b64: str

@dataclass
class ExtractedProduct:
    title: str; sku: Optional[str]; description: Optional[str]
    attributes: Dict[str, str]; page: int
    bbox: Dict[str, float]
    images: List[ImageBlock] = field(default_factory=list)


# ── Download ──────────────────────────────────────────────────────────────────

async def download_pdf(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.content


# ── Parse ─────────────────────────────────────────────────────────────────────

def parse_pdf_bytes(pdf_bytes: bytes) -> Tuple[List[TextBlock], List[ImageBlock], int]:
    if not _FITZ:
        raise RuntimeError("pymupdf not installed")

    text_blocks: List[TextBlock]  = []
    image_blocks: List[ImageBlock] = []

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise RuntimeError(f"Cannot open PDF: {e}")

    page_count = len(doc)

    for idx in range(page_count):
        try:
            page = doc[idx]; pn = idx + 1

            for blk in page.get_text("blocks", sort=True):
                x0, y0, x1, y1, text = blk[0], blk[1], blk[2], blk[3], blk[4]
                text = text.strip()
                if not text or len(text) < 2:
                    continue
                btype = "title" if _is_title(text) else ("table" if _is_table(text) else "text")
                text_blocks.append(TextBlock(text=text, page=pn, x0=x0, y0=y0, x1=x1, y1=y1, block_type=btype))

            for img_info in page.get_images(full=True):
                xref = img_info[0]
                try:
                    bi        = doc.extract_image(xref)
                    raw       = bi["image"]
                    w = h     = 0
                    if _PIL_OK:
                        try:
                            pil = _PIL.open(io.BytesIO(raw))
                            if pil.width < 30 or pil.height < 30:
                                continue
                            w, h = pil.width, pil.height
                            buf  = io.BytesIO()
                            pil.convert("RGB").save(buf, "PNG", optimize=True)
                            raw  = buf.getvalue()
                        except Exception:
                            pass
                    rect = _img_rect(page)
                    ix0, iy0, ix1, iy1 = rect if rect else (0.0, 0.0, 100.0, 100.0)
                    image_blocks.append(ImageBlock(
                        page=pn, x0=ix0, y0=iy0, x1=ix1, y1=iy1,
                        width=w, height=h, data_b64=base64.b64encode(raw).decode(),
                    ))
                except Exception as e:
                    logger.debug(f"p{pn} img xref={xref}: {e}")

        except Exception as e:
            logger.warning(f"Page {idx+1} skipped: {e}")

    doc.close()
    return text_blocks, image_blocks, page_count


def _img_rect(page: Any) -> Optional[Tuple[float, float, float, float]]:
    try:
        for b in page.get_text("rawdict").get("blocks", []):
            if b.get("type") == 1:
                bb = b.get("bbox", ())
                if len(bb) == 4:
                    return float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3])
    except Exception:
        pass
    return None

def _is_title(t: str) -> bool:
    w = t.strip().split()
    return 2 <= len(w) <= 12 and w[0][0].isupper() and not t.strip().endswith(".") and ";" not in t

def _is_table(t: str) -> bool:
    parts = re.split(r"\s{2,}|\t", t.strip())
    return len(parts) >= 3 and sum(1 for p in parts if re.search(r"\d", p)) >= 2


# ── Product detection (Improved Regex & Logic) ──────────────────────────────

_SKU_RE = [
    r"\b([A-Z]{1,4}[-_]?\d{3,12})\b",           # Буквы-цифры (напр. ABC-12345)
    r"\b(\d{2,4}\.\d{3,4}\.\d{2,4})\b",          # Коды с точками (12.345.67)
    r"\b([A-Z0-9]{6,20})\b",                    # Длинные артикулы
    r"\b(?:Арт|Код|SKU)[\s\.:]*([A-Z0-9\-]{4,20})\b", # С маркерами
]

_ATTR_RE: Dict[str, str] = {
    "Тиск":       r"(\d[\d,\.]*\s*(?:бар|bar|PN|ПН))",
    "Температура": r"(-?\d[\d,\.]*\s*(?:°C|°С))",
    "Діаметр":    r"(?:DN|D|Ø)\s*(\d[\d,\.]*)",
    "Напруга":    r"(\d[\d,\.]*\s*(?:В|V|кВ|kV))",
    "Вага":       r"(\d[\d,\.]*\s*(?:кг|г|kg|g))",
    "Розміри":    r"(\d+\s*[xхX×]\s*\d+(?:\s*[xхX×]\s*\d+)?)\s*(?:мм|mm)?",
}


def _sku(texts: List[str]) -> Optional[str]:
    combined = " ".join(texts)
    for pat in _SKU_RE:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _attrs(texts: List[str]) -> Dict[str, str]:
    combined = " ".join(texts)
    out: Dict[str, str] = {}
    for name, pat in _ATTR_RE.items():
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            out[name] = m.group(1).strip()
    return out


def _nearest(x0, y0, x1, y1, imgs: List[ImageBlock], max_d=250.0) -> List[ImageBlock]:
    cx, cy = (x0+x1)/2, (y0+y1)/2
    scored = []
    for img in imgs:
        d = ((cx-(img.x0+img.x1)/2)**2 + (cy-(img.y0+img.y1)/2)**2)**0.5
        if d <= max_d:
            scored.append((d, img))
    scored.sort(key=lambda t: t[0])
    return [i for _, i in scored[:3]]


def detect_products(
    text_blocks: List[TextBlock],
    image_blocks: List[ImageBlock],
) -> List[ExtractedProduct]:
    products: List[ExtractedProduct] = []
    pages: Dict[int, List[TextBlock]] = {}
    for b in text_blocks:
        pages.setdefault(b.page, []).append(b)

    for pn, blocks in sorted(pages.items()):
        blocks = sorted(blocks, key=lambda b: (b.y0, b.x0))
        page_imgs = [i for i in image_blocks if i.page == pn]
        i = 0
        while i < len(blocks):
            blk = blocks[i]
            
            # Смягченный вход: берем любой блок от 3 символов
            if len(blk.text) >= 3:
                group = [blk]
                j = i + 1
                while j < len(blocks):
                    nxt = blocks[j]
                    if nxt.block_type == "title" and j > i + 1: break
                    if nxt.y0 - group[-1].y1 > 70: break # Порог кучности блоков
                    group.append(nxt)
                    j += 1

                all_t = [b.text for b in group]
                sku_val = _sku(all_t)
                attr_vals = _attrs(all_t)

                # Создаем товар если есть хоть какая-то зацепка для поиска
                if sku_val or attr_vals or group[0].block_type == "title":
                    gx0, gy0 = min(b.x0 for b in group), min(b.y0 for b in group)
                    gx1, gy1 = max(b.x1 for b in group), max(b.y1 for b in group)

                    products.append(ExtractedProduct(
                        title=group[0].text[:256], 
                        sku=sku_val,
                        description=" ".join(all_t)[:1500],
                        attributes=attr_vals, 
                        page=pn,
                        bbox={"x0": gx0, "y0": gy0, "x1": gx1, "y1": gy1},
                        images=_nearest(gx0, gy0, gx1, gy1, page_imgs),
                    ))
                i = j
            else:
                i += 1
    return products
