'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Minus } from 'lucide-react'
import { apiService } from '@/lib/api'

interface Msg { role: 'user' | 'assistant'; content: string }

export function ChatWidget() {
  const [open, setOpen]       = useState(false)
  const [mini, setMini]       = useState(false)
  const [msgs, setMsgs]       = useState<Msg[]>([
    { role: 'assistant', content: 'Привіт! Я AI-асистент TI-Katalog. Допоможу знайти насоси, шланги, фітинги, манометри та інше промислове обладнання 🔧' }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    const t = input.trim()
    if (!t || loading) return
    const next: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(next); setInput(''); setLoading(true)
    try {
      const { reply } = await apiService.chat(next)
      setMsgs([...next, { role: 'assistant', content: reply }])
    } catch {
      setMsgs([...next, { role: 'assistant', content: '⚠️ Помилка. Перевірте API ключ в адмін-панелі.' }])
    } finally { setLoading(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      width: 52, height: 52, borderRadius: '50%', background: 'var(--brand)',
      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 32px var(--brand-g)',
    }}>
      <MessageCircle size={22} color="#fff" />
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(61,90,241,.5)', animation: 'pulse-ring 2s ease-out infinite' }} />
    </button>
  )

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      width: 340, height: mini ? 52 : 480, display: 'flex', flexDirection: 'column',
      borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-hi)',
      boxShadow: '0 24px 64px rgba(0,0,0,.5)', overflow: 'hidden', transition: 'height .25s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', height: 52, background: 'var(--brand)', flexShrink: 0,
        cursor: mini ? 'pointer' : 'default',
      }} onClick={() => mini && setMini(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={17} color="#fff" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>AI Асистент</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); setMini(v => !v) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.75)', padding: 4 }}><Minus size={14} /></button>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.75)', padding: 4 }}><X size={14} /></button>
        </div>
      </div>

      {!mini && <>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 27, height: 27, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'assistant' ? 'var(--brand)' : 'var(--bg-hover)' }}>
                {m.role === 'assistant' ? <Bot size={13} color="#fff" /> : <User size={13} style={{ color: 'var(--text-2)' }} />}
              </div>
              <div style={{
                maxWidth: '76%', padding: '9px 12px', fontSize: 13, lineHeight: 1.5,
                borderRadius: m.role === 'assistant' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                background: m.role === 'assistant' ? 'var(--bg-hover)' : 'var(--brand)',
                color: m.role === 'assistant' ? 'var(--text)' : '#fff',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 27, height: 27, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={13} color="#fff" /></div>
              <div style={{ padding: '9px 12px', borderRadius: '4px 14px 14px 14px', background: 'var(--bg-hover)', fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />Думаю…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Запитайте про шланг, фітинг, насос…" rows={1}
              className="input" style={{ resize: 'none', fontSize: 13, minHeight: 36, maxHeight: 80, flex: 1, borderRadius: 9 }}
            />
            <button onClick={send} disabled={!input.trim() || loading} className="btn btn-primary btn-icon" style={{ flexShrink: 0, borderRadius: 9 }}>
              <Send size={14} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 6 }}>Enter — надіслати</p>
        </div>
      </>}
    </div>
  )
}
