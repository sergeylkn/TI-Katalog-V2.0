'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Key, Download, RefreshCw, Eye, EyeOff, Loader2,
  Shield, Activity, Terminal, BarChart3, Trash2,
  Database, Zap, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react'
import { apiService, ImportStatus, ImportLog, ParseLog } from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'import' | 'logs' | 'parse'

export default function AdminPage() {
  const [tab,        setTab]       = useState<Tab>('overview')
  const [apiKey,     setApiKey]    = useState('')
  const [showKey,    setShowKey]   = useState(false)
  const [savedKey,   setSavedKey]  = useState<{ configured: boolean; masked: string | null } | null>(null)
  const [savingKey,  setSavingKey] = useState(false)
  const [status,     setStatus]    = useState<ImportStatus | null>(null)
  const [importing,  setImporting] = useState(false)
  const [impLogs,    setImpLogs]   = useState<ImportLog[]>([])
  const [parsLogs,   setParsLogs]  = useState<ParseLog[]>([])
  const [loadLogs,   setLoadLogs]  = useState(false)
  const [cacheInfo,  setCacheInfo] = useState<{ total: number; alive: number } | null>(null)
  const [autoRefresh,setAuto]      = useState(false)

  const loadStatus = useCallback(async () => {
    try { setStatus(await apiService.importStatus()) } catch {}
  }, [])

  useEffect(() => {
    loadStatus()
    apiService.getApiKey().then(setSavedKey).catch(() => {})
    apiService.cacheStats().then(setCacheInfo).catch(() => {})
  }, [loadStatus])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(loadStatus, 3000)
    return () => clearInterval(t)
  }, [autoRefresh, loadStatus])

  useEffect(() => {
    setAuto(!!(status?.parsing && status.parsing > 0))
  }, [status?.parsing])

  const loadLogs_ = useCallback(async () => {
    setLoadLogs(true)
    try {
      const [il, pl] = await Promise.all([apiService.importLogs(), apiService.parseLogs()])
      setImpLogs(il); setParsLogs(pl)
    } finally { setLoadLogs(false) }
  }, [])

  useEffect(() => {
    if (tab === 'logs' || tab === 'parse') loadLogs_()
  }, [tab, loadLogs_])

  const saveKey = async () => {
    if (!apiKey.trim()) return
    setSavingKey(true)
    try {
      await apiService.setApiKey(apiKey.trim())
      setSavedKey(await apiService.getApiKey())
      setApiKey('')
      toast.success('✅ API ключ збережено')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Помилка')
    } finally { setSavingKey(false) }
  }

  const startImport = async () => {
    setImporting(true)
    try {
      const r = await apiService.importAll()
      toast.success(r.message || 'Імпорт запущено ✓')
      setAuto(true); await loadStatus()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Помилка імпорту')
    } finally { setImporting(false) }
  }

  const clearCache = async () => {
    try {
      await apiService.clearCache()
      setCacheInfo(await apiService.cacheStats())
      toast.success('Кеш очищено')
    } catch { toast.error('Помилка') }
  }

  const clearDB = async () => {
    if (!confirm('Видалити всі товари та документи? Цю дію не можна скасувати.')) return
    try {
      await apiService.clearDatabase()
      await loadStatus()
      toast.success('База даних очищена')
    } catch { toast.error('Помилка очищення') }
  }

  // ── Tabs config ──────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'overview', label: 'Огляд',        Icon: BarChart3 },
    { id: 'import',   label: 'Імпорт PDF',   Icon: Download },
    { id: 'logs',     label: 'Логи імпорту', Icon: Terminal },
    { id: 'parse',    label: 'Логи парсингу',Icon: Activity },
  ]

  // ── Stat card helper ─────────────────────────────────────────────────────
  const Stat = (v: number, label: string, color: string, Icon: React.ElementType) => (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div>
      </div>
    </div>
  )

  const statusColor = (s: string) => s === 'success' ? 'var(--green)' : s === 'error' ? 'var(--red)' : 'var(--yellow)'
  const statusLabel = (s: string) => s === 'success' ? 'Успіх' : s === 'error' ? 'Помилка' : 'Пропущено'
  const levelIcon   = (l: string) => l === 'error' ? '❌' : l === 'warning' ? '⚠️' : 'ℹ️'

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>⚙️ Адмін-панель</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>TI-Katalog AI · 189 промислових каталогів</p>
        </div>
        {autoRefresh && (
          <span className="badge badge-yellow" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />Обробка…
          </span>
        )}
      </div>

      {/* ── API Key (always visible) ──────────────────────────────────────── */}
      <div className="card" style={{
        padding: '18px 20px', marginBottom: 22,
        borderColor: savedKey?.configured ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Shield size={16} style={{ color: savedKey?.configured ? 'var(--green)' : 'var(--yellow)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Claude / Anthropic API Ключ</span>
          <span className={`badge ${savedKey?.configured ? 'badge-green' : 'badge-yellow'}`} style={{ marginLeft: 'auto' }}>
            {savedKey?.configured ? '✓ Налаштовано' : '⚠ Не налаштовано'}
          </span>
        </div>
        {savedKey?.masked && (
          <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-hover)', marginBottom: 12, color: 'var(--text-2)' }}>
            🔑 {savedKey.masked}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input type={showKey ? 'text' : 'password'} value={apiKey}
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
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
          ⚠️ На Railway також додайте <code style={{ background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 4 }}>ANTHROPIC_API_KEY</code> як змінну середовища для автозапуску
        </p>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 12, background: 'var(--bg-hover)', marginBottom: 22 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 4px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            background: tab === id ? 'var(--bg-card)' : 'transparent',
            color: tab === id ? 'var(--text)' : 'var(--text-3)',
            border: 'none', cursor: 'pointer', transition: 'all .15s',
            boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,.25)' : 'none',
          }}>
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {status ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                {Stat(status.total,   'PDF всього',    'var(--brand-2)', Download)}
                {Stat(status.done,    'Оброблено',     'var(--green)',   CheckCircle)}
                {Stat(status.parsing, 'Обробляється',  'var(--yellow)',  Loader2)}
                {Stat(status.pending, 'Очікує',        '#a78bfa',        Clock)}
                {Stat(status.errors,  'Помилки',       'var(--red)',     AlertTriangle)}
              </div>

              {status.total > 0 && (
                <div className="card" style={{ padding: '16px 20px' }}>
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
            <div className="skeleton" style={{ height: 130, borderRadius: 14 }} />
          )}

          {/* Cache */}
          {cacheInfo && (
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Database size={15} style={{ color: 'var(--brand-2)' }} />
                <span style={{ fontWeight: 600 }}>AI Кеш пошуку:</span>
                <span style={{ color: 'var(--text-2)' }}>{cacheInfo.alive} активних / {cacheInfo.total} всього · TTL 5 хв</span>
              </div>
              <button onClick={clearCache} className="btn btn-ghost btn-sm"><Trash2 size={12} />Очистити</button>
            </div>
          )}

          {/* Danger zone */}
          <div className="card" style={{ padding: '14px 18px', borderColor: 'rgba(239,68,68,.2)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
              ⚠️ <strong>Небезпечна зона</strong> — повне очищення бази даних (документи, товари, логи)
            </p>
            <button onClick={clearDB} className="btn btn-danger btn-sm"><Trash2 size={12} />Очистити базу даних</button>
          </div>

          <button onClick={loadStatus} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
            <RefreshCw size={12} />Оновити статус
          </button>
        </div>
      )}

      {/* ── IMPORT ────────────────────────────────────────────────────────── */}
      {tab === 'import' && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Автоімпорт PDF з R2 бакету</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              Зчитує <code style={{ background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 4 }}>manifest.txt</code> з Cloudflare R2,
              автоматично розподіляє по технічних розділах та запускає AI-парсинг.
            </p>
            <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--bg-hover)', marginBottom: 18, fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-2)', wordBreak: 'break-all' }}>
              🪣 https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev/manifest.txt
            </div>
            <button onClick={startImport} disabled={importing} className="btn btn-primary">
              {importing
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Запускаю…</>
                : <><Download size={15} />Імпортувати всі PDF</>
              }
            </button>
          </div>

          <div className="card" style={{ padding: '18px 22px' }}>
            <h4 style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Як працює імпорт</h4>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none' }}>
              {[
                ['1', 'Manifest',     'Завантажує manifest.txt з R2 → список 189 PDF файлів'],
                ['2', 'Дедублікація', 'Перевірка по file_url — вже імпортовані пропускаються'],
                ['3', 'Розділи',      'Автоматичний розподіл: Манометри, Шланги, Фітинги, Насоси…'],
                ['4', 'Завантаження', 'Потокове завантаження кожного PDF з R2'],
                ['5', 'AI Парсинг',   'Claude вилучає технічні дані УКРАЇНСЬКОЮ: Тиск/Діаметр/Матеріал/Різьба'],
                ['6', 'Збереження',   'Товари з атрибутами та зображеннями зберігаються в PostgreSQL'],
              ].map(([n, t, d]) => (
                <li key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(61,90,241,.2)', color: 'var(--brand-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 8 }}>{d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <h4 style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Технічні розділи (автовизначення)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['📊','Манометри та датчики тиску'],
                ['🔌','Гідравлічні шланги'],
                ['🔗','Фітинги та з\'єднання'],
                ['⚙️','Насоси та насосні агрегати'],
                ['🛡️','Ущільнення та прокладки'],
                ['🔄','Клапани та засувки'],
                ['🔍','Фільтри та сепаратори'],
                ['📏','Труби та трубопроводи'],
                ['⚡','Кабелі та електротехніка'],
                ['📦','Загальний каталог'],
              ].map(([icon, name]) => (
                <span key={name} className="badge badge-muted" style={{ fontSize: 12 }}>{icon} {name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT LOGS ───────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="anim-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontWeight: 700 }}>Логи імпорту</h3>
            <button onClick={loadLogs_} disabled={loadLogs} className="btn btn-ghost btn-sm">
              <RefreshCw size={12} style={loadLogs ? { animation: 'spin 1s linear infinite' } : {}} />Оновити
            </button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadLogs ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr><th>Файл</th><th>Статус</th><th>Повідомлення</th><th>Час</th></tr>
                  </thead>
                  <tbody>
                    {impLogs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>Логів немає</td></tr>
                    ) : impLogs.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.document_name || l.filename || '—'}
                        </td>
                        <td>
                          <span className={`badge ${l.status === 'success' ? 'badge-green' : l.status === 'error' ? 'badge-red' : 'badge-muted'}`} style={{ fontSize: 11 }}>
                            {statusLabel(l.status)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.message}
                        </td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {l.created_at ? new Date(l.created_at).toLocaleString('uk') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PARSE LOGS ────────────────────────────────────────────────────── */}
      {tab === 'parse' && (
        <div className="anim-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontWeight: 700 }}>Логи парсингу (Claude AI)</h3>
            <button onClick={loadLogs_} disabled={loadLogs} className="btn btn-ghost btn-sm">
              <RefreshCw size={12} style={loadLogs ? { animation: 'spin 1s linear infinite' } : {}} />Оновити
            </button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadLogs ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr><th>Рівень</th><th>Повідомлення</th><th>Документ</th><th>Час</th></tr>
                  </thead>
                  <tbody>
                    {parsLogs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>Логів немає</td></tr>
                    ) : parsLogs.map(l => (
                      <tr key={l.id}>
                        <td>
                          <span className={`badge ${l.level === 'error' ? 'badge-red' : l.level === 'warning' ? 'badge-yellow' : 'badge-muted'}`} style={{ fontSize: 11 }}>
                            {levelIcon(l.level)} {l.level}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.message}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)' }}>
                          #{l.document_id}
                        </td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {l.created_at ? new Date(l.created_at).toLocaleString('uk') : '—'}
                        </td>
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
