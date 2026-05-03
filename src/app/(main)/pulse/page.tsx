"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyDepartment } from '@/lib/notify';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Send, Image, AtSign } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';

interface PulsePost {
  id: number;
  post_type: string;
  content: string;
  author_role: string;
  department_slug: string | null;
  color: string;
  emoji: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  mentions: string[];
  reactions: Record<string, number>;
  pinned: boolean;
  created_at: string;
}

interface PulseReply {
  id: number;
  post_id: number;
  content: string;
  author_role: string;
  department_slug: string | null;
  created_at: string;
}

const DEPT_SLUGS = [
  'founder-office', 'production', 'quality', 'inventory',
  'dispatch', 'marketing', 'finance', 'compliance', 'technology',
];

const DEPT_COLORS: Record<string, string> = {
  'founder-office': '#7F77DD',
  production:       '#0077B6',
  quality:          '#00B4D8',
  inventory:        '#48CAE4',
  dispatch:         '#0096C7',
  marketing:        '#F59E0B',
  finance:          '#023E8A',
  compliance:       '#03045E',
  technology:       '#90E0EF',
};

const REACTIONS = ['👍', '❤️', '🎉'];

function extractMentions(text: string): string[] {
  const matches = text.match(/@([\w-]+)/g) ?? [];
  return matches.map((m) => m.slice(1)).filter((slug) => DEPT_SLUGS.includes(slug));
}

function AnnouncementCard({
  post,
  replies,
  onReact,
  onReply,
}: {
  post: PulsePost;
  replies: PulseReply[];
  onReact: (postId: number, emoji: string) => void;
  onReply: (postId: number, content: string) => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(post.id, replyText.trim());
    setReplyText('');
    setSubmitting(false);
    setShowReplyBox(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0077B6, #7EC8E3)' }}>
          {post.author_role?.[0]?.toUpperCase() ?? 'M'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{post.author_role || 'Team Member'}</p>
          <p className="text-[10px] text-slate-400">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            {post.department_slug && (
              <span className="ml-2 font-bold" style={{ color: DEPT_COLORS[post.department_slug] ?? '#0077B6' }}>
                · {post.department_slug.replace(/-/g, ' ')}
              </span>
            )}
          </p>
        </div>
        {post.pinned && <span className="text-amber-400 text-sm flex-shrink-0">📌</span>}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        {post.image_url && (
          <img src={post.image_url} alt="Announcement" className="mt-3 rounded-xl max-h-48 object-cover w-full" />
        )}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[#0077B6] text-xs font-bold hover:opacity-80 transition-opacity"
          >
            📎 {post.link_label ?? 'View Link'}
          </a>
        )}
      </div>

      {/* Reactions + Reply */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(post.id, emoji)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-sm font-semibold"
          >
            {emoji}
            <span className="text-slate-500 text-[11px] ml-0.5">
              {(post.reactions as Record<string, number>)[emoji] ?? 0}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowReplyBox((p) => !p)}
          className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-[#0077B6] hover:opacity-70 transition-opacity"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Reply {replies.length > 0 && `(${replies.length})`}
        </button>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="px-5 pb-3 space-y-2 border-t border-slate-100 pt-3">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: DEPT_COLORS[r.department_slug ?? ''] ?? '#0077B6' }}
              />
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wide">{r.author_role}</span>
                <p className="text-slate-600 leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showReplyBox && (
        <div className="px-5 pb-4 flex gap-2 border-t border-slate-100 pt-3">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-3 py-2 text-sm focus:border-[#0077B6] focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          />
          <button
            onClick={handleReply}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-[#0077B6] text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PulsePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [replies, setReplies] = useState<PulseReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [deptSlug, setDeptSlug] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [posting, setPosting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const canPost = user?.role === 'founder' || user?.role === 'manager' || user?.role === 'operations_manager';

  const fetchPosts = async () => {
    const [{ data: postsData }, { data: repliesData }] = await Promise.all([
      supabase.from('pulse_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('pulse_replies').select('*').order('created_at', { ascending: true }),
    ]);
    setPosts((postsData as PulsePost[]) ?? []);
    setReplies((repliesData as PulseReply[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    const postChannel = supabase
      .channel('pulse_posts_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_posts' }, (payload) => {
        setPosts((prev) => [payload.new as PulsePost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pulse_posts' }, (payload) => {
        setPosts((prev) => prev.map((p) => (p.id === (payload.new as PulsePost).id ? (payload.new as PulsePost) : p)));
      })
      .subscribe();

    const replyChannel = supabase
      .channel('pulse_replies_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_replies' }, (payload) => {
        setReplies((prev) => [...prev, payload.new as PulseReply]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(replyChannel);
    };
  }, []);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    const mentions = extractMentions(content);

    const { data, error } = await supabase.from('pulse_posts').insert({
      post_type: 'announcement',
      content: content.trim(),
      author_role: authorRole || user?.name || user?.role || 'Team',
      department_slug: deptSlug || null,
      color: '#0077B6',
      emoji: '📢',
      link_url: linkUrl || null,
      link_label: linkLabel || null,
      mentions,
      reactions: { '👍': 0, '❤️': 0, '🎉': 0 },
    }).select().single();

    if (!error && data) {
      for (const slug of mentions) {
        await notifyDepartment(slug, content, (data as PulsePost).id);
      }
      const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      showToast({ type: 'success', message: `✓ Announcement posted at ${t}` });
    } else if (error) {
      showToast({ type: 'error', message: `Failed to post: ${error.message}` });
    }

    setContent('');
    setLinkUrl('');
    setLinkLabel('');
    setAuthorRole('');
    setDeptSlug('');
    setShowAdvanced(false);
    setPosting(false);
  };

  const handleReact = async (postId: number, emoji: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const updated = { ...post.reactions, [emoji]: ((post.reactions as Record<string, number>)[emoji] ?? 0) + 1 };
    await supabase.from('pulse_posts').update({ reactions: updated }).eq('id', postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: updated } : p)));
  };

  const handleReply = async (postId: number, replyContent: string) => {
    await supabase.from('pulse_replies').insert({
      post_id: postId,
      content: replyContent,
      author_role: user?.name || user?.role || 'Team',
      department_slug: deptSlug || null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-[#0077B6]" />
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Pulse
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Company announcements · Live
          </p>
        </div>
      </div>

      {/* Compose (founder + manager only) */}
      {canPost && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Post Announcement</p>
          <div className="relative">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                const last = e.target.value.split(' ').pop() ?? '';
                setShowMentionMenu(last.startsWith('@'));
              }}
              onBlur={() => setTimeout(() => setShowMentionMenu(false), 150)}
              placeholder="Share an update with the whole team… (use @ to mention a department)"
              rows={3}
              className="w-full bg-white border-2 border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-medium leading-relaxed resize-none focus:border-[#0077B6] focus:outline-none"
            />
            {showMentionMenu && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-10 mt-1">
                {DEPT_SLUGS.map((slug) => (
                  <button
                    key={slug}
                    onMouseDown={() => {
                      const words = content.split(' ');
                      words[words.length - 1] = `@${slug}`;
                      setContent(words.join(' ') + ' ');
                      setShowMentionMenu(false);
                      contentRef.current?.focus();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 transition-colors"
                    style={{ color: DEPT_COLORS[slug] }}
                  >
                    @{slug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced (link, dept) */}
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={deptSlug}
                onChange={(e) => setDeptSlug(e.target.value)}
                className="bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs focus:border-[#0077B6] focus:outline-none"
              >
                <option value="">All departments</option>
                {DEPT_SLUGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Link URL (optional)"
                className="bg-white border-2 border-slate-200 text-slate-700 placeholder-slate-400 rounded-xl px-3 py-2 text-xs focus:border-[#0077B6] focus:outline-none"
              />
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Link label"
                className="bg-white border-2 border-slate-200 text-slate-700 placeholder-slate-400 rounded-xl px-3 py-2 text-xs focus:border-[#0077B6] focus:outline-none col-span-2"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvanced((p) => !p)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <AtSign className="w-3.5 h-3.5" />
              {showAdvanced ? 'Less' : 'Add link / dept'}
            </button>
            <button
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0077B6] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">No announcements yet.</p>
          {canPost && <p className="text-slate-400 text-xs mt-1">Post the first company update above.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <AnnouncementCard
              key={post.id}
              post={post}
              replies={replies.filter((r) => r.post_id === post.id)}
              onReact={handleReact}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
