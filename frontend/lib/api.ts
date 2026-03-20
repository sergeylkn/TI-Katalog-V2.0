const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store', ...opts })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return r.json()
}

export interface Section {
  id: number; name: string; slug: string; document_count: number
}
export interface Product {
  id: number; document_id: number; section_id: number
  title: string; sku: string | null; description: string | null
  attributes: Record<string, string>; page_number: number | null
  primary_image: null; document_url: string | null
  original_url?: string; created_at: string | null
}
export interface SearchResult extends Product { source: string }
export interface Document {
  id: number; name: string; file_url: string; status: string
  section_id: number | null; page_count: number | null
  error_msg: string | null; parsed_at: string | null; created_at: string | null
}

export const apiService = {
  getSections: () => api<Section[]>('/api/documents/sections'),
  getDocuments: () => api<Document[]>('/api/documents/'),
  getDocument:  (id: number) => api<Document>(`/api/documents/${id}`),
  getProducts:  (p: Record<string, unknown> = {}) => {
    const qs = new URLSearchParams(Object.entries(p).map(([k,v]) => [k, String(v)])).toString()
    return api<{total:number,page:number,page_size:number,items:Product[]}>(`/api/products/?${qs}`)
  },
  getProduct:      (id: number) => api<Product & {document_url:string}>(`/api/products/${id}`),
  recommendations: (id: number) => api<{recommendations:(Product&{reason:string})[]}>(`/api/products/${id}/recommendations`),
  search:  (q: string, sid?: number) => api<{query:string,results:SearchResult[],count:number,source:string}>(`/api/search/?q=${encodeURIComponent(q)}${sid?`&section_id=${sid}`:''}`),
  suggest: (q: string) => api<{suggestions:{title:string,sku:string|null}[]}>(`/api/search/suggest?q=${encodeURIComponent(q)}`),
  chat:    (msg: string, hist: unknown[]) => api<{reply:string}>('/api/chat/', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history:hist})}),
  importAll:     () => api('/api/admin/import-all-pdfs', {method:'POST'}),
  importStatus:  () => api<{total:number,done:number,error:number,parsing:number,products:number,running:boolean}>('/api/admin/import-status'),
  importLogs:    () => api<{logs:unknown[]}>('/api/admin/import-logs?limit=50'),
  parseLogs:     () => api<{logs:unknown[]}>('/api/admin/parse-logs?limit=50'),
  setApiKey:     (k: string) => api('/api/admin/set-api-key', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:k})}),
  getApiKey:     () => api<{has_key:boolean,preview:string}>('/api/admin/get-api-key'),
  clearDatabase: () => api('/api/admin/clear-database', {method:'POST'}),
  reparse:       (id: number) => api(`/api/admin/reparse/${id}`, {method:'POST'}),
}
