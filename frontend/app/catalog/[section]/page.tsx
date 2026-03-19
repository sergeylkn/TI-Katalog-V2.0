'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiService, Product } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SectionPage() {
  const params = useParams();
  const sectionId = params.section as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionName, setSectionName] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiService.getProductsBySection(sectionId);
        setProducts(data);
        if (data.length > 0) {
          // Попытка найти название секции из первого товара
          setSectionName('Каталог товарів');
        }
      } catch (error) {
        console.error('Помилка завантаження секції:', error);
      } finally {
        setLoading(false);
      }
    }
    if (sectionId) load();
  }, [sectionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500">Завантаження товарів...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад до вибору розділу
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{sectionName}</h1>
        <p className="text-gray-500 mt-2">Знайдено {products.length} товарів</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed">
          <p className="text-gray-400">У цьому розділі поки що немає товарів</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
