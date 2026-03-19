import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  r => r,
  err => Promise.reject(new Error(err.response?.data?.detail || err.message || 'Помилка'))
)

// ── Types (Integer IDs) ────────────────────────────────────────────────────

export interface Section {
  id: number
  name: string
  slug: string
  description?: string
  document_count: number
}

export interface Document {
  id: number
  name: string
  filename: string
  file_url: string
  original_url: string
  section_id: number | null
  status: string
  page_count: number | null
  parsed_at: string | null
  created_at: string
  error_msg?: string
}

export interface ProductImage {
  id: number
  data: string
  page: number
  width: number
  height: number
  is_primary: boolean
}

export interface Product {
  id: number
  document_id: number
  section_id: number | null
  title: string
  sku: string | null
  description: string | null
  attributes: Record<string, string>
  page_number: number | null
  bbox: Record<string, number> | null
  primary_image: string | null
  document_url?: string
  created_at: string
  images?: ProductImage[]
  relevance?: number
  reason?: string
}

export interface SearchResponse {
  products: Product[]
  total_candidates: number
  summary: string
  confidence: number
  cached?: boolean
  source?: string
}

export interface ImportStatus {
  total: number
  done: number
  parsing: number
  pending: number
  errors: number
  is_importing: boolean
}

export interface ImportLog {
  id: number
  document_name: string
  filename: string
  status: string
  message: string
  created_at: string
}

export interface ParseLog {
  id: number
  document_id: number
  level: string
  message: string
  created_at: string
}

export interface Paginated<T> {
  total: number
  page: number
  page_size: number
  items: T[]
}

// ── API methods ────────────────────────────────────────────────────────────

export const apiService = {
  // Sections
  getSections: () =>
    api.get<Section[]>('/api/documents/sections').then(r => r.data),

  // Documents
  getDocuments: (params?: object) =>
    api.get<Paginated<Document>>('/api/documents/', { params }).then(r => r.data),
  getDocument: (id: number) =>
    api.get<Document>(`/api/documents/${id}`).then(r => ({
      ...r.data,
      filename: r.data.filename || r.data.name,
      original_url: r.data.original_url || r.data.file_url,
    })),

  // Products
  getProducts: (params?: object) =>
    api.get<Paginated<Product>>('/api/products/', { params }).then(r => r.data),
  getProductsBySection: (sectionId: number, page = 1, pageSize = 24) =>
    api.get<Paginated<Product>>(`/api/products/section/${sectionId}`, {
      params: { page, page_size: pageSize },
    }).then(r => r.data),
  getProduct: (id: number) =>
    api.get<Product>(`/api/products/${id}`).then(r => r.data),
  recommendations: (id: number) =>
    api.get<{ recommendations: (Product & { reason: string })[] }>(
      `/api/products/${id}/recommendations`
    ).then(r => r.data),

  // Search
  search: (q: string, sectionId?: number): Promise<SearchResponse> =>
    api.get<SearchResponse>('/api/search', {
      params: { q, ...(sectionId ? { section_id: sectionId } : {}) },
    }).then(r => r.data),
  suggest: (q: string) =>
    api.get<{ suggestions: string[] }>('/api/search/suggest', { params: { q } }).then(r => r.data),

  // Chat
  chat: (messages: { role: string; content: string }[]) =>
    api.post<{ reply: string }>('/api/chat', { messages }).then(r => r.data),

  // Admin
  setApiKey: (api_key: string) =>
    api.post('/api/admin/set-api-key', { api_key }).then(r => r.data),
  getApiKey: () =>
    api.get<{ configured: boolean; masked: string | null }>('/api/admin/get-api-key').then(r => r.data),
  importAll: () =>
    api.post('/api/admin/import-all-pdfs').then(r => r.data),
  startImport: function() { return this.importAll() },
  importStatus: () =>
    api.get<ImportStatus>('/api/admin/import-status').then(r => r.data),
  getImportStatus: function() { return this.importStatus() },
  importLogs: (limit = 100) =>
    api.get<ImportLog[]>('/api/admin/import-logs', { params: { limit } }).then(r => r.data),
  getImportLogs: function(limit = 100) { return this.importLogs(limit) },
  parseLogs: (limit = 100) =>
    api.get<ParseLog[]>('/api/admin/parse-logs', { params: { limit } }).then(r => r.data),
  getParseLogs: function() { return this.parseLogs() },
  clearCache: () =>
    api.post('/api/admin/clear-cache').then(r => r.data),
  cacheStats: () =>
    api.get<{ total: number; alive: number; ttl_seconds: number }>('/api/admin/cache-stats').then(r => r.data),
  clearDatabase: () =>
    api.post('/api/admin/clear-database').then(r => r.data),
  reparseDoc: (id: number) =>
    api.post(`/api/admin/reparse/${id}`).then(r => r.data),
  deleteDoc: (id: number) =>
    api.delete(`/api/admin/document/${id}`).then(r => r.data),
}

export const catalogApi = apiService
export default api
