import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Настройка путей для Docker и локальной разработки
base_path = os.path.dirname(os.path.abspath(__file__))
if base_path not in sys.path:
    sys.path.insert(0, base_path)

# Импортируем движок и базу
from core.database import engine, Base
# КРИТИЧЕСКИЙ ИМПОРТ: импортируем файл моделей целиком.
# Это регистрирует ВСЕ таблицы (Document, Product, Section, TextChunk, ImportLog) в объекте Base.
from models import models 

# Создаем таблицы в базе данных (PostgreSQL)
# Если таблицы уже созданы, SQLAlchemy это поймет и ничего не удалит.
# Если таблиц нет (как сейчас), он создаст их все сразу.
try:
    models.Base.metadata.create_all(bind=engine)
    logging.info("✅ Таблицы базы данных успешно проверены/созданы")
except Exception as e:
    logging.error(f"❌ Ошибка при создании таблиц: {e}")

app = FastAPI(title="TI-Katalog AI")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры (импорт внутри для избежания циклических зависимостей)
from api.admin import router as admin_router
from api.documents import router as doc_router
from api.products import router as prod_router

app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(doc_router, prefix="/api/documents", tags=["Documents"])
app.include_router(prod_router, prefix="/api/products", tags=["Products"])

@app.get("/")
async def root():
    return {
        "status": "online", 
        "db": "connected",
        "message": "Welcome to TI-Katalog AI API"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
