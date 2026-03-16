'use client';

import { useState, useEffect, useRef } from 'react';
import { captureScreenshot } from '@/lib/screenshot';
import SystemCheck from '@/components/SystemCheck';
import type { ChatMessage, ChatSession, ChatImage, ChatMode } from '@/lib/chatTypes';

const STORAGE_KEY = 'chh-sessions-v2';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function freshSession(mode: ChatMode = 'code'): ChatSession {
  return { id: uid(), title: 'New session', mode, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
}

/* ─── AI message renderer ───────────────────────────────────────────── */
function AIContent({ text }: { text: string }) {
  const segments = text.split(/(```[\s\S]*?```)/g);
  return (
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {segments.map((seg, i) => {
        if (seg.startsWith('```')) {
          const m = seg.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const lang = m?.[1] ?? '';
          const code = (m?.[2] ?? seg.replace(/^```\w*\n?/, '').replace(/```$/, '')).trim();
          return (
            <div key={i} style={{ margin: '12px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e1e35' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d0d1e', padding: '6px 14px' }}>
                <span style={{ fontSize: 11, color: '#6666aa', fontFamily: 'monospace' }}>{lang || 'code'}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(code); }}
                  style={{ fontSize: 11, color: '#4f8ef7', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e1e35')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >Copy</button>
              </div>
              <pre style={{ margin: 0, padding: '16px', background: '#080812', color: '#84d9a0', fontSize: 13, overflow: 'auto', lineHeight: 1.6 }}>
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: 4 }}>
            {seg.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j} style={{ color: '#c0c0ff' }}>{p.slice(2, -2)}</strong>
                : <span key={j}>{p}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
  const [pendingText, setPendingText] = useState('');
  const [inputTab, setInputTab] = useState<'screenshot' | 'paste'>('screenshot');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const current = sessions.find(s => s.id === currentId) ?? null;
  const mode: ChatMode = current?.mode ?? 'code';

  /* Load */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: ChatSession[] = JSON.parse(raw);
        setSessions(list);
        if (list.length) setCurrentId(list[0].id);
      } else {
        const s = freshSession();
        setSessions([s]);
        setCurrentId(s.id);
      }
    } catch {
      const s = freshSession();
      setSessions([s]);
      setCurrentId(s.id);
    }
  }, []);

  /* Persist (strip images from storage) */
  useEffect(() => {
    if (!sessions.length) return;
    try {
      const stripped = sessions.map(s => ({
        ...s,
        messages: s.messages.map(m => ({ ...m, images: undefined })),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    } catch { /* ignore */ }
  }, [sessions]);

  /* Scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [current?.messages.length, isLoading]);

  /* Helpers */
  const updateCurrent = (fn: (s: ChatSession) => ChatSession) =>
    setSessions(prev => prev.map(s => s.id === currentId ? fn(s) : s));

  const setMode = (m: ChatMode) => updateCurrent(s => ({ ...s, mode: m }));

  const newChat = () => {
    const s = freshSession(mode);
    setSessions(prev => [s, ...prev]);
    setCurrentId(s.id);
    setPendingImages([]);
    setPendingText('');
    setError(null);
    setShowHistory(false);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === currentId) {
        if (next.length) setCurrentId(next[0].id);
        else { const s = freshSession(mode); setCurrentId(s.id); return [s]; }
      }
      return next.length ? next : (() => { const s = freshSession(mode); setCurrentId(s.id); return [s]; })();
    });
  };

  /* Camera / File Upload */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(file);
        const data = await base64Promise;
        
        setPendingImages(prev => [...prev, { data, mediaType: file.type }]);
      }
    } catch (err) {
      setError('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
      // Reset input so the same file can be picked again
      e.target.value = '';
    }
  };

  const addScreenshot = async () => {
    setError(null);
    setCapturing(true);
    try {
      const { data, mediaType } = await captureScreenshot();
      setPendingImages(prev => [...prev, { data, mediaType }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Screenshot failed. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  /* Send */
  const send = async () => {
    if (!currentId || (!pendingImages.length && !pendingText.trim())) return;

    const userMsg: ChatMessage = {
      id: uid(), role: 'user',
      text: pendingText.trim(),
      images: pendingImages.length ? [...pendingImages] : undefined,
      timestamp: Date.now(),
    };

    const history = current?.messages ?? [];
    const imgs = [...pendingImages];
    const txt = pendingText.trim();

    updateCurrent(s => ({
      ...s,
      title: s.messages.length === 0 ? (txt.slice(0, 48) || `${imgs.length} screenshot(s)`) : s.title,
      messages: [...s.messages, userMsg],
      updatedAt: Date.now(),
    }));
    setPendingImages([]);
    setPendingText('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, newImages: imgs, newText: txt, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Server error');

      const aiMsg: ChatMessage = { id: uid(), role: 'assistant', text: data.content, timestamp: Date.now() };
      updateCurrent(s => ({ ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const canSend = !isLoading && (pendingImages.length > 0 || pendingText.trim().length > 0);
  const accentColor = mode === 'essay' ? '#9f6ef5' : '#4f8ef7';

  /* ─────────────── JSX ───────────────────────────────────────────── */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#08080f', color: '#e8e8f8', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ═══ HEADER ═══ */}
      <header style={{ flexShrink: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#0e0e1c', borderBottom: '1px solid #1e1e35', zIndex: 30 }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowHistory(h => !h)}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: showHistory ? '#1e1e35' : 'transparent', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
            onMouseEnter={e => { if (!showHistory) e.currentTarget.style.background = '#1a1a2e'; }}
            onMouseLeave={e => { if (!showHistory) e.currentTarget.style.background = 'transparent'; }}>
            <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4f8ef7, #9f6ef5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={16} height={16} fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>
                <span style={{ background: 'linear-gradient(135deg,#4f8ef7,#9f6ef5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Connie</span>
                <span style={{ color: '#e8e8f8' }}> AI</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: '#13131f', borderRadius: 10, padding: 3, gap: 2, border: '1px solid #1e1e35' }}>
            {(['code', 'essay'] as ChatMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  transition: 'all .15s',
                  background: mode === m ? (m === 'code' ? '#4f8ef7' : '#9f6ef5') : 'transparent',
                  color: mode === m ? '#fff' : '#666',
                }}>
                {m === 'code' ? '💻 Code' : '📝 Essay'}
              </button>
            ))}
          </div>
          <button onClick={newChat}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#4f8ef7', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#3a7de6'}
            onMouseLeave={e => e.currentTarget.style.background = '#4f8ef7'}>
            <svg width={13} height={13} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── History Sidebar ─── */}
        {showHistory && (
          <aside style={{ width: 240, flexShrink: 0, background: '#0c0c18', borderRight: '1px solid #1e1e35', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #1e1e30', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#555577', textTransform: 'uppercase' }}>Sessions</span>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#555577', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#aaa'} onMouseLeave={e => e.currentTarget.style.color = '#555577'}>
                <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
              {sessions.map(s => (
                <div key={s.id}
                  onClick={() => { setCurrentId(s.id); setShowHistory(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                    cursor: 'pointer', transition: 'background .1s',
                    background: s.id === currentId ? '#1a1a30' : 'transparent',
                    border: s.id === currentId ? '1px solid #2a2a45' : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (s.id !== currentId) (e.currentTarget as HTMLDivElement).style.background = '#141426'; }}
                  onMouseLeave={e => { if (s.id !== currentId) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                  <span style={{ fontSize: 14 }}>{s.mode === 'code' ? '💻' : '📝'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: s.id === currentId ? '#c0c0f0' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: '#444466' }}>{s.messages.length} messages</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                    style={{ background: 'none', border: 'none', color: '#444466', cursor: 'pointer', padding: 3, borderRadius: 4, flexShrink: 0, opacity: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#e55'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = '#444466'; }}>
                    <svg width={13} height={13} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* ─── Chat area ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Empty state */}
            {!current?.messages.length && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, rgba(79,142,247,.15), rgba(159,110,245,.15))', border: '1px solid #2e2e50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={36} height={36} fill="none" stroke="url(#grad)" viewBox="0 0 24 24">
                    <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4f8ef7"/><stop offset="100%" stopColor="#9f6ef5"/></linearGradient></defs>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#e0e0f8' }}>Your second device is your secret weapon 🔑</p>
                  <p style={{ fontSize: 13, color: '#555577', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
                    Exam locked your laptop? Use your phone. Snap the question, paste the text — Connie combines everything into one complete answer.
                  </p>
                </div>

                <SystemCheck />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {[
                    ['📸', 'Multi-shot capture', 'Parts 1, 2, 3 → one full answer'],
                    ['📋', 'Paste your text', 'Code challenge or essay prompt'],
                    ['💬', 'Ask follow-ups', 'Connie remembers all context'],
                    ['📂', 'Session history', 'Pick up where you left off'],
                  ].map(([icon, title, subtitle]) => (
                    <div key={title} style={{ background: '#10101c', border: '1px solid #1e1e30', borderRadius: 10, padding: '10px 14px', textAlign: 'left' }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#c0c0e0' }}>{title}</div>
                      <div style={{ fontSize: 11, color: '#444466', marginTop: 2 }}>{subtitle}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {current?.messages.map(msg => (
              <div key={msg.id} className="msg-enter" style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: msg.role === 'assistant' ? 10 : 12, fontWeight: 800, background: msg.role === 'user' ? accentColor : 'linear-gradient(135deg,#4f8ef7,#9f6ef5)', border: 'none', marginTop: 2, color: '#fff', letterSpacing: msg.role === 'assistant' ? '-0.5px' : '0' }}>
                  {msg.role === 'user' ? 'U' : 'C'}
                </div>
                {/* Bubble */}
                <div style={{
                  maxWidth: '72%', padding: '12px 16px', borderRadius: 14,
                  borderTopRightRadius: msg.role === 'user' ? 4 : 14,
                  borderTopLeftRadius: msg.role === 'user' ? 14 : 4,
                  background: msg.role === 'user' ? accentColor : '#12121e',
                  border: msg.role === 'user' ? 'none' : '1px solid #1e1e35',
                  color: msg.role === 'user' ? '#fff' : '#d8d8f0',
                }}>
                  {/* User images */}
                  {msg.images?.filter(i => i.data)?.length ? (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {msg.images.filter(i => i.data).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={`data:${img.mediaType};base64,${img.data}`} alt={`Shot ${i+1}`}
                            style={{ height: 100, borderRadius: 8, display: 'block', border: '1px solid rgba(255,255,255,.2)', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4 }}>#{i+1}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {msg.role === 'assistant'
                    ? <AIContent text={msg.text} />
                    : <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {msg.text || (msg.images?.length ? `${msg.images.length} screenshot(s) submitted` : '')}
                      </p>
                  }
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isLoading && (
              <div className="msg-enter" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#4f8ef7,#9f6ef5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>C</div>
                <div style={{ padding: '14px 18px', background: '#12121e', border: '1px solid #1e1e35', borderRadius: 14, borderTopLeftRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[0, 150, 300].map(d => (
                    <div key={d} className="thinking-dot" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span style={{ fontSize: 12, color: '#555577', marginLeft: 4 }}>Connie is thinking{mode === 'essay' ? ' about your essay' : ' through the problem'}…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: '0 16px 8px', background: 'rgba(220,50,50,.12)', border: '1px solid rgba(220,50,50,.3)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ff9999' }}>
              <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* ═══ INPUT AREA ═══ */}
          <div style={{ flexShrink: 0, background: '#0e0e1c', borderTop: '1px solid #1e1e35', padding: '14px 16px' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {([['screenshot', '📷', 'Screenshot'], ['camera', '📸', 'Camera'], ['paste', '📋', 'Paste Text']] as const).map(([tab, icon, label]) => (
                <button key={tab} 
                  onClick={() => {
                    if (tab === 'camera') {
                      cameraInputRef.current?.click();
                    } else {
                      setInputTab(tab as 'screenshot' | 'paste');
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: `1px solid ${inputTab === tab ? '#2e2e50' : 'transparent'}`, background: inputTab === tab ? '#1a1a30' : 'transparent', color: inputTab === tab ? '#c0c0f0' : '#555577', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                  <span>{icon}</span> {label}
                </button>
              ))}
              {pendingImages.length > 0 && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: accentColor, fontWeight: 600 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: accentColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{pendingImages.length}</span>
                  screenshot{pendingImages.length > 1 ? 's' : ''} queued
                </div>
              )}
            </div>

            {/* Pending images row */}
            {pendingImages.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {pendingImages.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}
                    onMouseEnter={e => { (e.currentTarget.querySelector('.del-btn') as HTMLElement)!.style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget.querySelector('.del-btn') as HTMLElement)!.style.opacity = '0'; }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:${img.mediaType};base64,${img.data}`} alt=""
                      style={{ height: 60, borderRadius: 8, display: 'block', border: '1px solid #2e2e50', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 3, left: 4, background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 10, padding: '1px 4px', borderRadius: 3 }}>#{i+1}</div>
                    <button className="del-btn" onClick={() => setPendingImages(p => p.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#c0392b', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', opacity: 0, transition: 'opacity .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {/* Add more */}
                <button onClick={addScreenshot} title="Add another screenshot"
                  style={{ height: 60, width: 60, borderRadius: 8, border: `2px dashed ${accentColor}33`, background: 'transparent', color: accentColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = `${accentColor}33`}>+</button>
              </div>
            )}

            {/* Screenshot capture button */}
            {inputTab === 'screenshot' && pendingImages.length === 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={addScreenshot} disabled={capturing}
                  style={{
                    width: '100%', marginBottom: 12, padding: '18px 0', borderRadius: 12,
                    border: `2px dashed ${capturing ? accentColor : '#2e2e50'}`,
                    background: capturing ? `${accentColor}11` : '#0a0a14',
                    color: capturing ? accentColor : '#444466',
                    cursor: capturing ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all .2s',
                  }}
                  onMouseEnter={e => { if (!capturing) { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; e.currentTarget.style.background = `${accentColor}0d`; } }}
                  onMouseLeave={e => { if (!capturing) { e.currentTarget.style.borderColor = '#2e2e50'; e.currentTarget.style.color = '#444466'; e.currentTarget.style.background = '#0a0a14'; } }}>
                  {capturing ? (
                    <><svg className="animate-spin" width={18} height={18} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25"/><path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Waiting for selection…</>
                  ) : (
                    <><svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Capture a screenshot — or snap your exam question with your phone camera</>
                  )}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#f59e0b', marginBottom: 12, padding: '0 4px' }}>
                  <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span><strong>Warning:</strong> Proctoring tools (Turing) detect in-browser screen sharing. Use phone for maximum stealth.</span>
                </div>
              </div>
            )}

            {/* Paste textarea */}
            {inputTab === 'paste' && (
              <textarea value={pendingText} onChange={e => setPendingText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
                placeholder={mode === 'essay' ? 'Paste your essay question or assignment brief here — Connie will write a complete, humanized response…' : 'Paste the coding problem, algorithm challenge, or exam question here — Connie will give you the full working solution…'}
                rows={5}
                style={{ width: '100%', marginBottom: 12, background: '#0a0a14', border: '1px solid #252540', borderRadius: 12, padding: '12px 14px', color: '#d0d0f0', fontSize: 13, fontFamily: 'var(--font-mono), monospace', resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => e.currentTarget.style.borderColor = accentColor}
                onBlur={e => e.currentTarget.style.borderColor = '#252540'} />
            )}

            {/* Follow-up text (shown after first message in screenshot mode) */}
            {inputTab === 'screenshot' && (pendingImages.length > 0 || (current?.messages.length ?? 0) > 0) && (
              <textarea value={pendingText} onChange={e => setPendingText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
                placeholder={current?.messages.length ? 'Ask Connie a follow-up… she remembers everything (Ctrl+Enter to send)' : 'Optional: add context — which part to focus on, language to use, etc.'}
                rows={2}
                style={{ width: '100%', marginBottom: 12, background: '#0a0a14', border: '1px solid #252540', borderRadius: 10, padding: '10px 14px', color: '#d0d0f0', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => e.currentTarget.style.borderColor = accentColor}
                onBlur={e => e.currentTarget.style.borderColor = '#252540'} />
            )}

            {/* Send row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#333355' }}>Ctrl+Enter to send</span>
              <button onClick={send} disabled={!canSend}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: canSend ? `linear-gradient(135deg, ${accentColor}, ${mode === 'essay' ? '#7c3aed' : '#6366f1'})` : '#1a1a2e',
                  color: canSend ? '#fff' : '#333355', cursor: canSend ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, transition: 'opacity .15s', opacity: canSend ? 1 : 0.5,
                  boxShadow: canSend ? `0 4px 20px ${accentColor}40` : 'none',
                }}>
                {isLoading
                  ? <><svg className="animate-spin" width={15} height={15} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".3"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Connie is thinking…</>
                  : <>{mode === 'essay' ? '✍️ Ask Connie to Write' : '🤖 Ask Connie to Solve'} <svg width={13} height={13} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg></>
                }
              </button>
            </div>
            {/* Hidden Inputs */}
            <input type="file" ref={cameraInputRef} style={{ display: 'none' }} accept="image/*" capture="environment" onChange={e => handleFileUpload(e, true)} />
          </div>
        </div>
      </div>
    </div>
  );
}
