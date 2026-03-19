import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API_URL });

export interface Section { id: string; name: string; slug: string; count?: number; document_count?: number; }
export interface Document { id: string; name: string; filename: string; file_url: string; original_url: string; category?: string; created_at: string; }

export interface Product { 
  id: string; title: string; sku: string | null; description: string | null; 
  attributes: Record<string, string>; page_number: number; bbox: Record<string, number>; 
  document_id: string; document_url: string; relevance?: number; reason?: string;
  images?: { id: string; data: string }[]; primary_image?: string;
}

export interface SearchResponse { products: Product[]; total_candidates: number; summary: string; confidence: number; cached?: boolean; }
export type SearchResult = SearchResponse;

export interface Recommendation extends Omit<Product, 'sku'> { sku: string; reason: string; }
export interface RecommendationsResponse { recommendations: Recommendation[]; }

export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }
export interface ChatResponse { reply: string; }

export interface ImportStatus { is_importing: boolean; total: number; done: number; parsing: number; pending: number; errors: number; current_file?: string; }
export interface ImportLog { id: string; document_name: string; filename?: string; status: string; message: string; created_at: string; }
export interface ParseLog { id: string; level: string; message: string; document_id?: string; created_at: string; }

export const apiService = {
  async getDocuments() { const { data } = await api.get('/api/documents'); return data.map((d: any) => ({ ...d, filename: d.filename || d.name || 'Untitled', original_url: d.original_url || d.file_url || '' })); },
  async getDocument(id: string) { const { data } = await api.get(`/api/documents/${id}`); return { ...data, filename: data.filename || data.name || 'Document', original_url: data.original_url || data.file_url || '' }; },
  async getSections() { const { data } = await api.get('/api/documents/sections'); return data.map((s: any) => ({ ...s, document_count: s.document_count ?? s.count ?? 0, slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') })); },
  
  async search(query: string, sectionId?: string): Promise<SearchResponse> {
    const params: any = { q: query };
    if (sectionId) params.section_id = sectionId;
    const { data } = await api.get('/api/search', { params });
    return { ...data, cached: !!data.cached };
  },

  // Упрощенный метод: возвращаем string[], как того требует Navbar.tsx
  async suggest(query: string): Promise<{ suggestions: string[] }> {
    const { data } = await api.get('/api/search/suggest', { params: { q: query } });
    const suggestions = (data.suggestions || []).map((s: any) => typeof s === 'string' ? s : s.text);
    return { suggestions };
  },

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const { data } = await api.post('/api/chat', { messages });
    return data;
  },

  async getProductsBySection(sectionId: string) { const { data } = await api.get(`/api/products/section/${sectionId}`); return data; },
  async getProduct(id: string) { const { data } = await api.get(`/api/products/${id}`); return data; },
  
  async recommendations(id: string): Promise<RecommendationsResponse> {
    const { data } = await api.get(`/api/products/${id}/recommendations`);
    return { recommendations: (data.recommendations || []).map((p: any) => ({ ...p, sku: p.sku || '', reason: p.reason || 'Схожий товар' })) };
  },

  async getImportStatus() { const { data } = await api.get('/api/admin/import-status'); return { is_importing: data.is_importing ?? false, total: data.total ?? data.total_files ?? 0, done: data.done ?? data.processed_files ?? 0, parsing: data.parsing ?? 0, pending: data.pending ?? 0, errors: data.errors ?? 0, current_file: data.current_file }; },
  async importStatus() { return this.getImportStatus(); },
  async getImportLogs(limit = 100) { const { data } = await api.get(`/api/admin/import-logs?limit=${limit}`); return data.map((l: any) => ({ ...l, filename: l.filename || l.document_name })); },
  async importLogs(limit = 100) { return this.getImportLogs(limit); },
  async getParseLogs() { const { data } = await api.get('/api/admin/parse-logs'); return data; },
  async parseLogs() { return this.getParseLogs(); },
  async startImport() { const { data } = await api.post('/api/admin/import-all-pdfs'); return data; },
  async runImport() { return this.startImport(); },
  async importAll() { return this.startImport(); },
  async clearDatabase() { const { data } = await api.post('/api/admin/clear-database'); return data; },
  async getApiKey() { const { data } = await api.get('/api/admin/get-api-key'); return { configured: !!data.api_key, masked: data.api_key ? '********' : null }; },
  async setApiKey(key: string) { const { data } = await api.post('/api/admin/set-api-key', { api_key: key }); return data; },
  async cacheStats() { const { data } = await api.get('/api/admin/cache-stats'); return data; },
  async clearCache() { const { data } = await api.post('/api/admin/clear-cache'); return data; }
};

export const catalogApi = apiService;
export default api;
