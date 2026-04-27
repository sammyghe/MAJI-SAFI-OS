'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
  id: string;
  author_name: string;
  author_role: string | null;
  body: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface RightRailProps {
  entityType: string;
  entityId: string;
  label?: string;
}

export default function RightRail({ entityType, entityId, label }: RightRailProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await fetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`);
    const data = await res.json();
    setComments(data ?? []);
  };

  useEffect(() => { load(); }, [entityType, entityId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const send = async () => {
    if (!draft.trim() || !user) return;
    setSending(true);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        author_name: user.name ?? 'Unknown',
        author_role: user.role ?? null,
        body: draft.trim(),
      }),
    });
    setDraft('');
    setSending(false);
    load();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {label ?? `${entityType} thread`}
        </p>
        {comments.length > 0 && (
          <span className="ml-auto text-[10px] text-slate-700">{comments.length}</span>
        )}
      </div>

      {/* Comments */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {comments.length === 0 ? (
          <p className="text-slate-700 text-[11px] text-center py-4">No comments yet. Be the first.</p>
        ) : comments.map(c => (
          <div key={c.id} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white">{c.author_name}</span>
              {c.author_role && <span className="text-[9px] text-slate-600 uppercase">{c.author_role}</span>}
              <span className="text-[9px] text-slate-700 ml-auto">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a comment… (Enter to send)"
            rows={2}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#0077B6]/50 resize-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className="p-2.5 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-[#7EC8E3] hover:bg-[#0077B6]/30 disabled:opacity-30 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
