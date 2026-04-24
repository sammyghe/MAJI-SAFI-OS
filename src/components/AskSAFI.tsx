'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
}

const DEPT_SLUGS = ['founder-office','production','quality','inventory','dispatch','marketing','finance','compliance','technology'];

function getDeptFromPath(path: string): string | undefined {
  const segment = path.split('/').find((s) => DEPT_SLUGS.includes(s));
  return segment;
}

export default function AskSAFI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const department = getDeptFromPath(pathname ?? '');

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, department }),
      });
      const data = await res.json();
      if (data.answer) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, provider: data.provider }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error ?? 'Unknown error'}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error — please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const deptLabel = department
    ? department.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'All Departments';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 88,
          right: 24,
          zIndex: 50,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: open ? '#0077B6' : '#0A0A0A',
          border: '2px solid #0077B6',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,119,182,0.4)',
          transition: 'all 0.2s',
        }}
        title="Ask SAFI"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 152,
            right: 24,
            zIndex: 50,
            width: 360,
            maxHeight: 520,
            display: 'flex',
            flexDirection: 'column',
            background: '#10141a',
            border: '1px solid rgba(0,119,182,0.3)',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#0A0A0A' }}>
            <Bot size={18} color="#7EC8E3" />
            <div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 13, color: '#fff', letterSpacing: -0.3 }}>
                Ask SAFI
              </div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                {deptLabel} · Groq → Gemini → Claude
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 180, maxHeight: 360 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
                <Bot size={28} style={{ marginBottom: 8, color: '#0077B6', display: 'block', margin: '0 auto 8px' }} />
                Ask anything about {deptLabel}.<br />
                <span style={{ fontSize: 11, color: '#334155' }}>Finance/Inventory answers cite their source.</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    background: m.role === 'user' ? '#0077B6' : '#1e293b',
                    color: '#fff',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '9px 13px',
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && m.provider && m.provider !== 'offline' && (
                  <div style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: 1, paddingLeft: 4 }}>
                    via {m.provider}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#1e293b', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Loader2 size={14} color="#7EC8E3" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>Thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, background: '#0A0A0A' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Ask about ${deptLabel.toLowerCase()}…`}
              disabled={loading}
              style={{
                flex: 1,
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '9px 13px',
                fontSize: 13,
                color: '#fff',
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: input.trim() && !loading ? '#0077B6' : '#1e293b',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
