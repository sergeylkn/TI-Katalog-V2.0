"""
ORM Models — Integer PKs, asyncpg-compatible, DeclarativeBase with __allow_unmapped__.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Index
from sqlalchemy.orm import relationship, DeclarativeBase


def _now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    __allow_unmapped__ = True


class Section(Base):
    __tablename__ = "sections"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(256), unique=True, nullable=False, index=True)
    slug        = Column(String(256), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), default=_now)
    documents   = relationship("Document", back_populates="section")


class Document(Base):
    __tablename__ = "documents"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(512), nullable=False, index=True)
    file_url    = Column(String(1024), nullable=False, unique=True)
    status      = Column(String(32), default="pending", nullable=False)
    section_id  = Column(Integer, ForeignKey("sections.id"), nullable=True)
    page_count  = Column(Integer, nullable=True)
    error_msg   = Column(Text, nullable=True)
    parsed_at   = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), default=_now)
    section     = relationship("Section", back_populates="documents")
    products    = relationship("Product",   back_populates="document", cascade="all, delete-orphan")
    chunks      = relationship("TextChunk", back_populates="document", cascade="all, delete-orphan")
    __table_args__ = (Index("ix_documents_status", "status"),)


class Product(Base):
    __tablename__ = "products"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    section_id  = Column(Integer, ForeignKey("sections.id"), nullable=True)
    title       = Column(String(512), nullable=False, index=True)
    sku         = Column(String(128), nullable=True, index=True)
    description = Column(Text, nullable=True)
    attributes  = Column(JSON, default=dict)
    page_number = Column(Integer, nullable=True)
    bbox        = Column(JSON, nullable=True)
    created_at  = Column(DateTime(timezone=True), default=_now)
    document    = relationship("Document", back_populates="products")
    images      = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    __table_args__ = (Index("ix_products_doc", "document_id"),)


class ProductImage(Base):
    __tablename__ = "product_images"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    product_id  = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    image_data  = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    bbox        = Column(JSON, nullable=True)
    width       = Column(Integer, nullable=True)
    height      = Column(Integer, nullable=True)
    is_primary  = Column(Boolean, default=False)
    product     = relationship("Product", back_populates="images")


class TextChunk(Base):
    __tablename__ = "text_chunks"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    product_id  = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    text        = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False)
    bbox        = Column(JSON, nullable=True)
    block_type  = Column(String(32), default="text")
    document    = relationship("Document", back_populates="chunks")
    __table_args__ = (Index("ix_chunks_doc_page", "document_id", "page_number"),)


class ImportLog(Base):
    __tablename__ = "import_logs"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    document_id   = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    document_name = Column(String(512), nullable=True)
    status        = Column(String(32), nullable=False)
    message       = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), default=_now)


class ParseLog(Base):
    __tablename__ = "parse_logs"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    level       = Column(String(16), nullable=False)
    message     = Column(Text, nullable=False)
    created_at  = Column(DateTime(timezone=True), default=_now)
