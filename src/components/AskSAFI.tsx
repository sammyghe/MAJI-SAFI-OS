'use client';

import { useState, useRef, useEffect } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageCircle, X, Send, Loader2, Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

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
  const { user } = useAuth();

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [micError, setMicError] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicSupported(false);
      }
    }
  }, []);

  useEffect(() => {
    // Load preference
    if (user) {
      const prefs = ((user as any).preferences as Record<string, any>) || {};
      const enabled = prefs.voice_enabled ?? localStorage.getItem('safi_voice_enabled') === 'true';
      setVoiceEnabled(enabled);
    }
  }, [user]);

  const toggleVoice = async () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    localStorage.setItem('safi_voice_enabled', String(newVal));
    if (user) {
      const prefs = ((user as any).preferences as Record<string, any>) || {};
      await supabase.from('team_members').update({ preferences: { ...prefs, voice_enabled: newVal } }).eq('id', user.id);
    }
    if (!newVal && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!micSupported) return;
    setMicError('');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setInput(currentText);

      // Auto-stop after 2s of silence
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        stopListening(true);
      }, 2000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setMicError('Microphone access denied.');
      }
      stopListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // Only trigger send if it ended naturally (silence)
        stopListening(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
    }
  };

  const stopListening = (autoSend: boolean = false) => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    
    if (autoSend && inputRef.current && inputRef.current.value.trim()) {
      // Small delay to allow final transcript to settle
      setTimeout(() => {
        send(inputRef.current?.value);
      }, 500);
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Simple cleaning for TTS
    utterance.text = text.replace(/\[source:.*?\]/g, '').replace(/[*#]/g, '');
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (overrideInput?: string) => {
    const q = (overrideInput || input).trim();
    if (!q || loading) return;
    setInput('');
    if (isListening) stopListening(false);
    
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
        speakText(data.answer);
      } else {
        const errStr = `Error: ${data.error ?? 'Unknown error'}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: errStr }]);
        speakText(errStr);
      }
    } catch {
      const errStr = 'Connection error — please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errStr }]);
      speakText(errStr);
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
        <motion.div
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
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A0A0A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <button 
              onClick={toggleVoice}
              style={{ background: 'none', border: 'none', color: voiceEnabled ? '#7EC8E3' : '#475569', cursor: 'pointer' }}
              title={voiceEnabled ? 'Voice output on' : 'Voice output off'}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
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
                  <div style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: 1, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    via {m.provider}
                    {isSpeaking && i === messages.length - 1 && (
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ width: 4, height: 4, borderRadius: '50%', background: '#7EC8E3' }}
                      />
                    )}
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
            {micSupported && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}>
                {isListening && (
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #0077B6', pointerEvents: 'none' }}
                  />
                )}
                {isListening && (
                  <motion.div
                    animate={{ scale: [1, 1.2], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #0077B6', pointerEvents: 'none' }}
                  />
                )}
                <button
                  onClick={() => isListening ? stopListening(false) : startListening()}
                  disabled={loading}
                  style={{
                    width: '100%', height: '100%', borderRadius: 12, border: 'none',
                    background: isListening ? '#1e293b' : 'transparent',
                    color: isListening ? '#ef4444' : '#64748b',
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 2
                  }}
                  title="Voice input"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
            )}
            <button
              onClick={() => send()}
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
          {micError && (
            <div style={{ padding: '4px 12px 10px', background: '#0A0A0A', color: '#ef4444', fontSize: 10, textAlign: 'center' }}>
              {micError}
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
