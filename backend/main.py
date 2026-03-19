"""TI-Katalog AI — FastAPI Backend"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from core.database import engine
from models.models import Base

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 TI-Katalog AI starting…")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ All DB tables ready")
    yield
    logger.info("🛑 Shutdown")


app = FastAPI(title="TI-Katalog AI", version="2.0.0", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.admin        import router as admin_router
from api.documents    import router as doc_router
from api.products     import router as prod_router
from api.search       import router as search_router
from api.chat         import router as chat_router

app.include_router(admin_router,  prefix="/api/admin",     tags=["Admin"])
app.include_router(doc_router,    prefix="/api/documents", tags=["Documents"])
app.include_router(prod_router,   prefix="/api/products",  tags=["Products"])
app.include_router(search_router, prefix="/api/search",    tags=["Search"])
app.include_router(chat_router,   prefix="/api/chat",      tags=["Chat"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/")
async def root():
    return {"service": "TI-Katalog AI", "docs": "/docs"}
