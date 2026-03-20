'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Zap } from 'lucide-react'
import { apiService } from '@/lib/api'

interface Msg { role: 'user'|'assistant'; content: string }

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(newMsgs)
    setLoading(true)
    try {
      const hist = newMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const { reply } = await apiService.chat(text, hist.slice(0, -1))
      setMsgs([...newMsgs, { role: 'assistant', content: reply }])
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: 'Помилка. Перевірте API ключ в адмінці.' }])
    } finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(v => !v)} style={{
        position: 'fixed', bottom: 24, right: 24, width: 50, height: 50, borderRadius: '50%',
        background: 'var(--brand-grad)', border: 'none', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(61,107,250,.4)',
        zIndex: 1000,
      }}>
        {open ? <X size={20} color="#fff" /> : <MessageCircle size={20} color="#fff" />}
      </button>

      {open && (
        <div className="card" style={{
          position: 'fixed', bottom: 84, right: 24, width: 320, height: 440,
          display: 'flex', flexDirection: 'column', zIndex: 1000,
          boxShadow: '0 8px 40px rgba(0,0,0,.5)',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Zap size={14} style={{ color: 'var(--brand-2)' }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>AI Асистент</span>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
                Запитайте про товари каталогу
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--brand)' : 'var(--bg-hover)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                padding: '8px 12px', borderRadius: 10, maxWidth: '85%', fontSize: 12, lineHeight: 1.5,
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 10 }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-3)' }} />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ваше питання…" className="input" style={{ flex: 1, height: 34, fontSize: 12 }} />
            <button onClick={send} disabled={loading || !input.trim()} className="btn btn-primary btn-icon">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
