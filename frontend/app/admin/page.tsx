'use client'
import { useEffect, useState, useCallback } from 'react'
import { Settings, Key, RefreshCw, Trash2, Play, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { apiService } from '@/lib/api'

interface Status { total:number; done:number; error:number; parsing:number; products:number; running:boolean }

export default function AdminPage() {
  const [apiKey, setApiKey] = useState('')
  const [keyInfo, setKeyInfo] = useState<{has_key:boolean,preview:string} | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [importLogs, setImportLogs] = useState<unknown[]>([])
  const [parseLogs, setParseLogs] = useState<unknown[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [s, k, il, pl] = await Promise.all([
        apiService.importStatus(), apiService.getApiKey(),
        apiService.importLogs(), apiService.parseLogs(),
      ])
      setStatus(s); setKeyInfo(k)
      setImportLogs((il as {logs:unknown[]}).logs)
      setParseLogs((pl as {logs:unknown[]}).logs)
    } catch {}
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh])

  const saveKey = async () => {
    setSaving(true)
    try { await apiService.setApiKey(apiKey); setMsg('✅ API ключ збережено'); setApiKey(''); refresh() }
    catch { setMsg('❌ Помилка збереження') }
    finally { setSaving(false) }
  }

  const startImport = async () => {
    try { await apiService.importAll(); setMsg('✅ Імпорт запущено'); refresh() }
    catch { setMsg('❌ Помилка запуску') }
  }

  const clearDb = async () => {
    if (!confirm('Видалити всі дані?')) return
    try { await apiService.clearDatabase(); setMsg('✅ База очищена'); refresh() }
    catch { setMsg('❌ Помилка очищення') }
  }

  const pct = status && status.total > 0 ? Math.round((status.done / status.total) * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings size={20} style={{ color: 'var(--brand)' }} /> Адміністрування
      </h1>

      {msg && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 16, fontSize: 13, borderColor: msg.includes('✅') ? '#4ade80' : '#f87171', color: msg.includes('✅') ? '#4ade80' : '#f87171' }}>
          {msg}
        </div>
      )}

      {/* API Key */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Key size={15} style={{ color: 'var(--brand)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Claude API ключ</span>
          {keyInfo?.has_key && <span className="badge badge-ok">Активний: {keyInfo.preview}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-…" className="input" style={{ flex: 1 }} />
          <button onClick={saveKey} disabled={saving || !apiKey} className="btn btn-primary">
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Зберегти'}
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <RefreshCw size={15} style={{ color: 'var(--brand)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Статус імпорту</span>
            {status.running && <span className="badge badge-warn"><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Виконується</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10, marginBottom: 14 }}>
            {[
              ['Всього PDF', status.total, ''],
              ['Готово', status.done, 'ok'],
              ['Помилки', status.error, 'err'],
              ['Парситься', status.parsing, 'warn'],
              ['Товарів', status.products, 'brand'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: cls === 'ok' ? '#4ade80' : cls === 'err' ? '#f87171' : cls === 'warn' ? '#fbbf24' : cls === 'brand' ? 'var(--brand)' : 'var(--text)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {status.total > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
                <span>Прогрес парсингу</span><span>{pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-grad)', transition: 'width .4s' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={startImport} disabled={status.running} className="btn btn-primary">
              <Play size={13} /> Імпортувати всі PDF
            </button>
            <button onClick={clearDb} className="btn btn-ghost" style={{ color: '#f87171', borderColor: '#f87171' }}>
              <Trash2 size={13} /> Очистити БД
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <LogPanel title="Import Logs" logs={importLogs} />
        <LogPanel title="Parse Logs" logs={parseLogs} />
      </div>
    </div>
  )
}

function LogPanel({ title, logs }: { title: string; logs: unknown[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={12} style={{ color: 'var(--text-3)' }} />{title}
      </div>
      <div style={{ maxHeight: 300, overflow: 'auto', padding: '6px 0' }}>
        {(logs as {id:number,status?:string,level?:string,msg?:string,doc?:string,at:string}[]).slice(0,50).map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 8, padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,.03)', alignItems: 'flex-start' }}>
            <span style={{ marginTop: 1 }}>
              {(l.status === 'success' || l.level === 'info')
                ? <CheckCircle size={11} style={{ color: '#4ade80' }} />
                : (l.status === 'error' || l.level === 'error')
                ? <XCircle size={11} style={{ color: '#f87171' }} />
                : <Loader2 size={11} style={{ color: '#fbbf24' }} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.doc || l.msg || '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                {new Date(l.at).toLocaleTimeString('uk')}
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>Логів ще немає</div>}
      </div>
    </div>
  )
}
