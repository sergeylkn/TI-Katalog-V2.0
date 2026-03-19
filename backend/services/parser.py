import asyncio, logging, re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

@dataclass
class ExtractedProduct:
    title: str
    sku: Optional[str]
    description: str  # Здесь хранится всё техническое описание для ИI
    page: int
    bbox: Dict[str, float]
    raw_text: str     # Необработанный текст для глубокого анализа ИИ
    image_rects: List[Dict[str, float]] = field(default_factory=list)

async def parse_document(pdf_bytes: bytes) -> List[ExtractedProduct]:
    """Основная функция для импортера: извлекает товары с тех. описанием"""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_products = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        curr_page_num = page_num + 1
        
        # 1. Получаем все блоки текста на странице
        blocks = page.get_text("blocks", sort=True)
        
        # 2. Получаем координаты всех изображений на странице
        img_info = page.get_images(full=True)
        page_img_rects = []
        for img in img_info:
            for r in page.get_image_rects(img[0]):
                page_img_rects.append({"x0": r.x0, "y0": r.y0, "x1": r.x1, "y1": r.y1})

        # 3. Группируем текст в логические блоки (товары)
        # Мы объединяем блоки, если расстояние между ними меньше 50 пунктов
        temp_products = []
        for b in blocks:
            x0, y0, x1, y1, text, block_no, block_type = b
            if block_type != 0 or not text.strip(): continue # Пропускаем не текст
            
            clean_text = text.replace('\n', ' ').strip()
            if len(clean_text) < 3: continue

            # Если новый блок близко к предыдущему — объединяем
            if temp_products and y0 - temp_products[-1]['y1'] < 50:
                temp_products[-1]['text'] += " " + clean_text
                temp_products[-1]['y1'] = max(temp_products[-1]['y1'], y1)
                temp_products[-1]['x1'] = max(temp_products[-1]['x1'], x1)
                temp_products[-1]['x0'] = min(temp_products[-1]['x0'], x0)
            else:
                temp_products.append({
                    'text': clean_text, 
                    'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1
                })

        # 4. Превращаем группы в объекты ExtractedProduct
        for tp in temp_products:
            # Ищем SKU (артикул) внутри собранного текста
            sku_match = re.search(r'\b([A-Z0-9]{5,20})\b', tp['text'])
            sku = sku_match.group(1) if sku_match else None
            
            # Привязываем картинки, которые находятся в зоне этого текста
            rel_imgs = [
                img for img in page_img_rects 
                if abs(img['y0'] - tp['y0']) < 100 # Картинка рядом с текстом
            ]

            all_products.append(ExtractedProduct(
                title=tp['text'].split('.')[0][:255], # Первое предложение как заголовок
                sku=sku,
                description=tp['text'], # Полный текст для поиска ИИ
                raw_text=tp['text'].lower(),
                page=curr_page_num,
                bbox={"x0": tp['x0'], "y0": tp['y0'], "x1": tp['x1'], "y1": tp['y1']},
                image_rects=rel_imgs
            ))

    doc.close()
    return all_products
