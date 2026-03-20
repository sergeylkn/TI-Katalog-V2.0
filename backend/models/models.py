"""
ORM Models — LIGHTWEIGHT for 500MB Railway PostgreSQL.
NO image_data in DB. Images served via PDF page URL from R2.
Tables: sections, documents, products, import_logs, parse_logs (5 total)
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship, DeclarativeBase


def _now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    __allow_unmapped__ = True


class Section(Base):
    __tablename__ = "sections"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(256), unique=True, nullable=False, index=True)
    slug       = Column(String(256), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    documents  = relationship("Document", back_populates="section")


class Document(Base):
    __tablename__ = "documents"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(512), nullable=False, index=True)
    file_url   = Column(String(1024), nullable=False, unique=True)
    status     = Column(String(32), default="pending", nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    page_count = Column(Integer, nullable=True)
    error_msg  = Column(Text, nullable=True)
    parsed_at  = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    section    = relationship("Section", back_populates="documents")
    products   = relationship("Product", back_populates="document", cascade="all, delete-orphan")
    __table_args__ = (Index("ix_documents_status", "status"),)


class Product(Base):
    __tablename__ = "products"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    section_id  = Column(Integer, ForeignKey("sections.id"), nullable=True)
    title       = Column(String(512), nullable=False, index=True)
    sku         = Column(String(128), nullable=True, index=True)
    description = Column(String(600), nullable=True)
    attributes  = Column(JSON, default=dict)
    page_number = Column(Integer, nullable=True)
    created_at  = Column(DateTime(timezone=True), default=_now)
    document    = relationship("Document", back_populates="products")
    __table_args__ = (
        Index("ix_products_doc", "document_id"),
        Index("ix_products_section", "section_id"),
    )


class ImportLog(Base):
    __tablename__ = "import_logs"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    document_id   = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    document_name = Column(String(512), nullable=True)
    status        = Column(String(32), nullable=False)
    message       = Column(String(400), nullable=True)
    created_at    = Column(DateTime(timezone=True), default=_now)


class ParseLog(Base):
    __tablename__ = "parse_logs"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    level       = Column(String(16), nullable=False)
    message     = Column(String(400), nullable=False)
    created_at  = Column(DateTime(timezone=True), default=_now)
