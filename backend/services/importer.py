import httpx
import logging
import sys
import os

# Додаємо кореневу директорию (backend) в шлях пошуку модулів
# Це дозволить Python бачити папки 'models' та 'core'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Імпортуємо правильні моделі та сесію бази даних
try:
    from models.models import Document, Section, ImportLog
    from core.database import SessionLocal
except ImportError as e:
    logging.error(f"❌ Помилка імпорту модулів: {e}. Перевірте структуру папок.")
    raise e

logger = logging.getLogger("importer")

async def run_import_all(db):
    manifest_url = "https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev/manifest.txt"
    try:
        logger.info(f"🔄 Запуск повного імпорту з R2")
        async with httpx.AsyncClient() as client:
            response = await client.get(manifest_url)
            if response.status_code != 200:
                logger.error(f"❌ Помилка завантаження маніфесту: {response.status_code}")
                return {"error": "Manifest download failed"}

        # Отримуємо список файлів
        files = [line.strip() for line in response.text.split('\n') if line.strip() and line.endswith('.pdf')]
        
        new_docs = 0
        for file_name in files:
            # Перевірка на дублікати за назвою файлу
            existing = db.query(Document).filter(Document.name == file_name).first()
            if not existing:
                # Створюємо документ згідно з новою моделлю (включаючи поле section_id)
                doc = Document(
                    name=file_name,
                    file_url=f"https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev/{file_name}",
                    status="pending",
                    section_id=None # Можна буде призначити пізніше автоматично
                )
                db.add(doc)
                
                # Також записуємо в лог імпорту
                log = ImportLog(
                    document_name=file_name,
                    status="pending",
                    message="Added to queue from manifest"
                )
                db.add(log)
                new_docs += 1
        
        db.commit()
        logger.info(f"✅ Успішно додано {new_docs} нових документів у чергу.")
        return {"added": new_docs, "total": len(files)}

    except Exception as e:
        logger.error(f"❌ Критична помилка імпорту: {str(e)}")
        db.rollback()
        raise e
