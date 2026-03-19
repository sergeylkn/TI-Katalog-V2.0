'use client';

import React from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import { ExternalLink, FileText, Target, Sparkles } from 'lucide-react';
import Link from 'next/link';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Product {
  id: string;
  title: string;
  sku: string | null;
  description: string | null;
  page_number: number;
  document_url: string;
  document_id?: string;
  relevance?: number; // Добавлено для поиска
  reason?: string;    // Добавлено для поиска
}

interface ProductCardProps {
  product: Product;
  relevance?: number; // Разрешаем пропс relevance
  reason?: string;    // Разрешаем пропс reason
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, relevance, reason }) => {
  // Используем либо пропсы напрямую, либо поля из объекта продукта
  const rel = relevance ?? product.relevance;
  const res = reason ?? product.reason;

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      {/* Индикатор релевантности (если есть) */}
      {rel !== undefined && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur rounded-full shadow-sm border border-blue-100 text-[10px] font-bold text-blue-600">
          <Target className="w-3 h-3" />
          {Math.round(rel * 100)}%
        </div>
      )}

      {/* Превью PDF */}
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center scale-[0.35] origin-top transform transition-transform duration-500 group-hover:scale-[0.38]">
          <Document file={product.document_url} loading={<div className="animate-pulse bg-gray-200 w-full h-full" />}>
            <Page pageNumber={product.page_number} renderTextLayer={false} renderAnnotationLayer={false} width={500} />
          </Document>
        </div>
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-medium text-gray-400">
          Стор. {product.page_number}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          {product.sku && (
            <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1">
              {product.sku}
            </span>
          )}
          <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
        </div>

        {/* Пояснение от ИИ в поиске */}
        {res && (
          <div className="mb-3 p-2 bg-amber-50/50 rounded-lg border border-amber-100/50 text-[11px] text-amber-800 flex gap-1.5">
            <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">{res}</p>
          </div>
        )}

        <p className="text-gray-500 text-xs line-clamp-2 mb-4 flex-grow italic">
          {product.description || 'Опис відсутній'}
        </p>

        <div className="flex gap-2 pt-2 border-t border-gray-50">
          <Link 
            href={`/product/${product.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Деталі
          </Link>
          <a 
            href={product.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
