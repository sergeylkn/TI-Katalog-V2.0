"""Async PostgreSQL database — Railway-ready."""

import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

_raw = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/tikatalog"
)
# Railway gives postgresql:// — upgrade to asyncpg driver
DATABASE_URL = _raw.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
