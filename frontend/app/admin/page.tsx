'use client'
import { useEffect, useState, useCallback } from 'react'
import { Key, Download, RefreshCw, Eye, EyeOff, Loader2, Shield, Activity, Terminal, BarChart3, Trash2 } from 'lucide-react'
import { catalogApi, ImportStatus, ImportLog, ParseLog } from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'import' | 'logs' | 'parse'

export default function AdminPage() {
  const [tab, setTab]               = useState<Tab>('overview')
  const [apiKey, setApiKey]         = useState('')
  const [showKey, setShowKey]       = useState(false)
  const [savedKey, setSavedKey]     = useState<{ configured: boolean; masked: string | null } | null>(null)
  const [savingKey, setSavingKey]   = useState(false)
  const [status, setStatus]         = useState<ImportStatus | null>(null)
  const [importing, setImporting]   = useState(false)
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])
  const [parseLogs, setParseLogs]   = useState<ParseLog[]>([])
  const [loadingLogs, setLoadLogs]  = useState(false)
  const [cacheInfo, setCacheInfo]   = useState<{ total: number; alive: number } | null>(null)
  const [autoRefresh, setAuto]      = useState(false)

  const loadStatus = useCallback(async () => {
    try { setStatus(await catalogApi.importStatus()) } catch {}
  }, [])

  useEffect(() => {
    loadStatus()
    catalogApi.getApiKey().then(setSavedKey).catch(() => {})
    catalogApi.cacheStats().then(setCacheInfo).catch(() => {})
  }, [loadStatus])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(loadStatus, 3000)
    return () => clearInterval(t)
  }, [autoRefresh, loadStatus])

  useEffect(() => {
    setAuto(!!(status?.parsing && status.parsing > 0))
  }, [status?.parsing])

  const loadLogs = useCallback(async () => {
    setLoadLogs(true)
    try {
      const [imp, parse] = await Promise.all([catalogApi.importLogs(), catalogApi.parseLogs()])
      setImportLogs(imp); setParseLogs(parse)
    } finally { setLoadLogs(false) }
  }, [])

  useEffect(() => {
    if (tab === 'logs' || tab === 'parse') loadLogs()
  }, [tab, loadLogs])

  const saveKey = async () => {
    if (!apiKey.trim()) return
    setSavingKey(true)
    try {
      await catalogApi.setApiKey(apiKey.trim())
      setSavedKey(await catalogApi.getApiKey())
      setApiKey('')
      toast.success('✅ API ключ збережено')
    } catch (e: any) { toast.error(e.message) }
    finally { setSavingKey(false) }
  }

  const startImport = async () => {
    setImporting(true)
    try {
      const r = await catalogApi.importAll()
      toast.success(r.message || 'Імпорт запущено')
      setAuto(true); await loadStatus()
    } catch (e: any) { toast.error(e.message) }
    finally { setImporting(false) }
  }

  const clearCache = async () => {
    try {
      const r = await catalogApi.clearCache()
      setCacheInfo(await catalogApi.cacheStats())
      toast.success(`Кеш очищено (${r.cleared} записів)`)
    } catch { toast.error('Помилка очищення кешу') }
  }

  const TABS: { id: Tab; label: string; Icon: any }[] = [
    { id: 'overview', label: 'Огляд',        Icon: BarChart3 },
    { id: 'import',   label: 'Імпорт PDF',   Icon: Download },
    { id: 'logs',     label: 'Логи імпорту', Icon: Terminal },
    { id: 'parse',    label: 'Логи парсингу',Icon: Activity },
  ]

  const S = (v: number, color: string, label: string, Icon: any) => (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color }}>{v}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>⚙️ Адмін-панель</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>Управління платформою · Технічний Каталог AI</p>
        </div>
        {autoRefresh && (
          <span className="badge badge-yellow" style={{ display: 'flex', gap: 6 }}>
            <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />Оновлення…
          </span>
        )}
      </div>

      {/* API Key card — always visible */}
      <div className="card" style={{ padding: '20px 22px', marginBottom: 24, borderColor: savedKey?.configured ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Shield size={16} style={{ color: savedKey?.configured ? 'var(--green)' : 'var(--yellow)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Claude API Ключ</span>
          <span className={`badge ${savedKey?.configured ? 'badge-green' : 'badge-yellow'}`} style={{ marginLeft: 'auto' }}>
            {savedKey?.configured ? '✓ Налаштовано' : '⚠ Не налаштовано'}
          </span>
        </div>

        {savedKey?.masked && (
          <div style={{ fontFamily: 'monospace', fontSize: 13, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-hover)', marginBottom: 12, color: 'var(--text-2)' }}>
            🔑 {savedKey.masked}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder={savedKey?.configured ? 'Оновити ключ…' : 'sk-ant-api03-…'}
              className="input" style={{ paddingRight: 40 }}
            />
            <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button onClick={saveKey} disabled={!apiKey.trim() || savingKey} className="btn btn-primary">
            {savingKey ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={14} />}
            Зберегти
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--bg-hover)', marginBottom: 24 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 4px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            background: tab === id ? 'var(--bg-card)' : 'transparent',
            color: tab === id ? 'var(--text)' : 'var(--text-3)',
            border: 'none', cursor: 'pointer', transition: 'all .15s',
            boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,.25)' : 'none',
          }}>
            <Icon size={13} /><span style={{ display: 'none' }} className="sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {status ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
                {S(status.total,   'var(--brand-2)', 'PDF всього',   Download)}
                {S(status.done,    'var(--green)',   'Оброблено',    Activity)}
                {S(status.parsing, 'var(--yellow)',  'Обробляється', Loader2)}
                {S(status.pending, '#a78bfa',        'Очікує',       RefreshCw)}
                {S(status.errors,  'var(--red)',     'Помилки',      Terminal)}
              </div>

              {status.total > 0 && (
                <div className="card" style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                    <span style={{ color: 'var(--text-2)' }}>Прогрес обробки</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-3)' }}>{status.done}/{status.total}</span>
                  </div>
                  <div className="conf-bar" style={{ height: 8 }}>
                    <div className="conf-fill" style={{ width: `${status.total ? (status.done / status.total * 100) : 0}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="skeleton" style={{ height: 140, borderRadius: 14 }} />
          )}

          {/* Cache info */}
          {cacheInfo && (
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>AI Кеш:</span>
                <span style={{ color: 'var(--text-2)', marginLeft: 8 }}>{cacheInfo.alive} активних / {cacheInfo.total} всього · TTL 5 хв</span>
              </div>
              <button onClick={clearCache} className="btn btn-ghost btn-sm"><Trash2 size={12} />Очистити</button>
            </div>
          )}

          <button onClick={loadStatus} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
            <RefreshCw size={12} />Оновити
          </button>
        </div>
      )}

      {/* ── IMPORT ── */}
      {tab === 'import' && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '22px 24px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Імпорт PDF з R2 бакету</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              Автоматично знаходить та імпортує всі PDF з Cloudflare R2.
              Дублікати пропускаються. Парсинг запускається автоматично.
            </p>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-hover)', marginBottom: 18, fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-2)' }}>
              🪣 https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev
            </div>
            <button onClick={startImport} disabled={importing} className="btn btn-primary">
              {importing ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Запускаю…</> : <><Download size={15} />Імпортувати всі PDF</>}
            </button>
          </div>

          <div className="card" style={{ padding: '20px 24px' }}>
            <h4 style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>Як це працює</h4>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 0, listStyle: 'none' }}>
              {[
                ['Виявлення', 'manifest.txt → catalog_index.json → послідовний перебір до 198 файлів'],
                ['Дедублікація', 'Порівняння по URL — вже імпортовані пропускаються'],
                ['Розділи', 'Автоматичний розподіл за ключовими словами у назві файлу'],
                ['Завантаження', 'Потокове завантаження з R2 для кожного PDF'],
                ['Парсинг', 'PyMuPDF вилучає текст, bbox, зображення з кожної сторінки'],
                ['Збереження', 'Товари з характеристиками та фото зберігаються у PostgreSQL'],
              ].map(([t, d], i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(69,97,248,.2)', color: 'var(--brand-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 8 }}>{d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ── IMPORT LOGS ── */}
      {tab === 'logs' && (
        <div className="anim-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>Логи імпорту</h3>
            <button onClick={loadLogs} disabled={loadingLogs} className="btn btn-ghost btn-sm">
              <RefreshCw size={12} style={loadingLogs ? { animation: 'spin 1s linear infinite' } : {}} />Оновити
            </button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadingLogs ? <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} /></div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead><tr><th>Файл</th><th>Статус</th><th>Повідомлення</th><th>Час</th></tr></thead>
                  <tbody>
                    {importLogs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>Логів немає</td></tr>
                    ) : importLogs.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.filename || '—'}</td>
                        <td><span className={`badge ${l.status === 'success' ? 'badge-green' : l.status === 'error' ? 'badge-red' : 'badge-muted'}`} style={{ fontSize: 11 }}>
                          {l.status === 'success' ? 'Успіх' : l.status === 'error' ? 'Помилка' : 'Пропущено'}
                        </span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('uk')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PARSE LOGS ── */}
      {tab === 'parse' && (
        <div className="anim-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>Логи парсингу</h3>
            <button onClick={loadLogs} disabled={loadingLogs} className="btn btn-ghost btn-sm">
              <RefreshCw size={12} style={loadingLogs ? { animation: 'spin 1s linear infinite' } : {}} />Оновити
            </button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadingLogs ? <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} /></div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead><tr><th>Рівень</th><th>Повідомлення</th><th>Документ</th><th>Час</th></tr></thead>
                  <tbody>
                    {parseLogs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>Логів немає</td></tr>
                    ) : parseLogs.map(l => (
                      <tr key={l.id}>
                        <td><span className={`badge ${l.level === 'error' ? 'badge-red' : l.level === 'warning' ? 'badge-yellow' : 'badge-muted'}`} style={{ fontSize: 11 }}>
                          {l.level === 'error' ? '❌' : l.level === 'warning' ? '⚠️' : 'ℹ️'} {l.level}
                        </span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)' }}>{l.document_id?.slice(0, 8)}…</td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('uk')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
