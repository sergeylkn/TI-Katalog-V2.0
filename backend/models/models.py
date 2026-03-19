from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    documents = relationship("Document", back_populates="section")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True)
    file_url = Column(String)
    status = Column(String, default="pending")
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    section = relationship("Section", back_populates="documents")
    text_chunks = relationship("TextChunk", back_populates="document")

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    sku = Column(String, index=True, nullable=True)
    description = Column(Text, nullable=True)
    attributes = Column(JSON, default={})
    page_number = Column(Integer)
    document_id = Column(Integer, ForeignKey("documents.id"))
    document_url = Column(String)
    relevance = Column(String, nullable=True)
    reason = Column(Text, nullable=True)

class TextChunk(Base):
    __tablename__ = "text_chunks"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    text = Column(Text)
    page_number = Column(Integer)
    embedding = Column(JSON, nullable=True) # Для будущего поиска по смыслу
    
    document = relationship("Document", back_populates="text_chunks")

class ImportLog(Base):
    __tablename__ = "import_logs"
    id = Column(Integer, primary_key=True, index=True)
    document_name = Column(String)
    status = Column(String)
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
