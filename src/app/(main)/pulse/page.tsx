"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyDepartment } from '@/lib/notify';
import { formatDistanceToNow } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────
const POST_TYPES = [
  { type: 'update',         label: 'Update',    emoji: '📌', color: '#0077B6' },
  { type: 'win',            label: 'Win',       emoji: '🏆', color: '#10B981' },
  { type: 'question',       label: 'Question',  emoji: '❓', color: '#06B6D4' },
  { type: 'shoutout',       label: 'Shout-out', emoji: '📣', color: '#F59E0B' },
  { type: 'milestone',      label: 'Milestone', emoji: '🎯', color: '#7F77DD' },
  { type: 'project_update', label: 'Project',   emoji: '📊', color: '#8B5CF6' },
  { type: 'alert',          label: 'Alert',     emoji: '🚨', color: '#EF4444' },
];

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

const REACTIONS = ['💧', '🔥', '✅', '🎉'];

// ── Helpers ───────────────────────────────────────────────────
function typeConfig(type: string) {
  return POST_TYPES.find((t) => t.type === type) ?? POST_TYPES[0];
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([\w-]+)/g) ?? [];
  return matches
    .map((m) => m.slice(1))
    .filter((slug) => DEPT_SLUGS.includes(slug));
}

// ── Card Component ────────────────────────────────────────────
function PostCard({
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
  const cfg = typeConfig(post.post_type);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const borderStyle = { borderLeftColor: post.color };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(post.id, replyText.trim());
    setReplyText('');
    setSubmitting(false);
    setShowReplyBox(false);
  };

  return (
    <div
      className="rounded-[1.5rem] border border-white/10 overflow-hidden bg-brand-deep/60 backdrop-blur-md"
      style={{ borderLeftWidth: '4px', borderLeftColor: post.color, borderLeftStyle: 'solid' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest"
        style={{ backgroundColor: post.color + '22' }}
      >
        <span className="text-lg">{post.emoji}</span>
        <span style={{ color: post.color }}>{cfg.label}</span>
        <span className="text-brand-steel">·</span>
        {post.department_slug && (
          <>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ backgroundColor: (DEPT_COLORS[post.department_slug] ?? '#5483B3') + '33', color: DEPT_COLORS[post.department_slug] ?? '#C1E8FF' }}
            >
              {post.department_slug.replace('-', ' ').toUpperCase()}
            </span>
            <span className="text-brand-steel">·</span>
          </>
        )}
        <span className="text-brand-steel font-bold normal-case tracking-normal">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
        {post.pinned && <span className="ml-auto text-amber-400">📌 Pinned</span>}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-white font-semibold text-sm leading-relaxed">{post.content}</p>

        {/* Link */}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-brand-sky text-[11px] font-black uppercase tracking-widest hover:text-brand-pale transition-colors"
          >
            📎 {post.link_label ?? 'View Link'}
          </a>
        )}

        {/* Alert pulsing dot */}
        {post.post_type === 'alert' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">Active Alert</span>
          </div>
        )}
      </div>

      {/* Reactions + Reply */}
      <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(post.id, emoji)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-bold"
          >
            {emoji}
            <span className="text-brand-steel text-[11px]">
              {(post.reactions as Record<string, number>)[emoji] ?? 0}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowReplyBox((p) => !p)}
          className="ml-2 text-[11px] font-black text-brand-sky uppercase tracking-widest hover:text-brand-pale transition-colors"
        >
          + Reply {replies.length > 0 && `(${replies.length})`}
        </button>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="px-5 pb-3 space-y-2 border-t border-white/5 pt-3">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: DEPT_COLORS[r.department_slug ?? ''] ?? '#5483B3' }}
              />
              <div>
                <span className="font-black text-brand-sky uppercase tracking-widest text-[10px]">
                  {r.author_role}
                </span>
                <p className="text-brand-steel leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      {showReplyBox && (
        <div className="px-5 pb-4 flex gap-2 border-t border-white/5 pt-3">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          />
          <button
            onClick={handleReply}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-brand-sky/20 border border-brand-sky/30 text-brand-pale text-xs font-black uppercase tracking-widest hover:bg-brand-sky/30 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PulsePage() {
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [replies, setReplies] = useState<PulseReply[]>([]);
  const [tab, setTab] = useState<'all' | 'department'>('all');
  const [loading, setLoading] = useState(true);

  // Compose state
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('update');
  const [authorRole, setAuthorRole] = useState('Team Member');
  const [deptSlug, setDeptSlug] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [posting, setPosting] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const selectedType = typeConfig(postType);

  // ── Fetch ────────────────────────────────────────────────────
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

    // Real-time: new posts
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

  // ── Post submission ───────────────────────────────────────────
  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    const mentions = extractMentions(content);
    const cfg = typeConfig(postType);

    const { data, error } = await supabase.from('pulse_posts').insert({
      post_type: postType,
      content: content.trim(),
      author_role: authorRole || 'Team Member',
      department_slug: deptSlug || null,
      color: cfg.color,
      emoji: cfg.emoji,
      link_url: linkUrl || null,
      link_label: linkLabel || null,
      mentions,
      reactions: { '💧': 0, '🔥': 0, '✅': 0, '🎉': 0 },
    }).select().single();

    if (!error && data) {
      // Notify mentioned departments
      for (const slug of mentions) {
        await notifyDepartment(slug, content, (data as PulsePost).id);
      }
    }

    setContent('');
    setLinkUrl('');
    setLinkLabel('');
    setPosting(false);
  };

  // ── React ─────────────────────────────────────────────────────
  const handleReact = async (postId: number, emoji: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const updated = { ...post.reactions, [emoji]: ((post.reactions as Record<string, number>)[emoji] ?? 0) + 1 };
    await supabase.from('pulse_posts').update({ reactions: updated }).eq('id', postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: updated } : p)));
  };

  // ── Reply ─────────────────────────────────────────────────────
  const handleReply = async (postId: number, replyContent: string) => {
    await supabase.from('pulse_replies').insert({
      post_id: postId,
      content: replyContent,
      author_role: authorRole || 'Team Member',
      department_slug: deptSlug || null,
    });
  };

  const displayedPosts = tab === 'department' && deptSlug
    ? posts.filter((p) => p.department_slug === deptSlug || p.mentions.includes(deptSlug))
    : posts;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Maji Safi <span className="text-brand-sky">Pulse</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] font-black text-brand-steel uppercase tracking-widest">Company Feed · Live</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-brand-navy/30 rounded-xl border border-white/5">
          {(['all', 'department'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-brand-sky/20 text-brand-pale border border-brand-sky/30'
                  : 'text-brand-steel hover:text-white'
              }`}
            >
              {t === 'all' ? 'All' : 'My Department'}
            </button>
          ))}
        </div>
      </div>

      {/* Compose Box */}
      <div className="rounded-[2rem] bg-brand-deep/60 backdrop-blur-md border border-white/10 p-6 space-y-4">
        <div className="flex gap-3 items-start">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 mt-1"
            style={{ backgroundColor: selectedType.color + '33' }}
          >
            {selectedType.emoji}
          </div>
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              // Show mention menu when @ is typed
              const last = e.target.value.split(' ').pop() ?? '';
              setShowMentionMenu(last.startsWith('@'));
            }}
            onBlur={() => setTimeout(() => setShowMentionMenu(false), 150)}
            placeholder="What's happening at Maji Safi? (Use @ to mention a department)"
            rows={3}
            className="flex-1 bg-transparent text-white placeholder:text-brand-steel/60 text-sm font-semibold leading-relaxed resize-none focus:outline-none"
          />
        </div>

        {/* @mention dropdown */}
        {showMentionMenu && (
          <div className="ml-13 bg-brand-navy border border-white/10 rounded-xl overflow-hidden text-xs">
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
                className="w-full text-left px-4 py-2 font-bold text-brand-steel hover:bg-white/5 hover:text-white transition-colors"
                style={{ color: DEPT_COLORS[slug] }}
              >
                @{slug}
              </button>
            ))}
          </div>
        )}

        {/* Type selector */}
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => setPostType(t.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                postType === t.type
                  ? 'border-transparent text-white'
                  : 'border-white/10 text-brand-steel hover:text-white hover:border-white/20'
              }`}
              style={postType === t.type ? { backgroundColor: t.color + '33', borderColor: t.color + '66', color: t.color } : {}}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Role + Dept + Link */}
        <div className="grid grid-cols-2 gap-3">
          <input
            value={authorRole}
            onChange={(e) => setAuthorRole(e.target.value)}
            placeholder="Your role (e.g. Ops Lead)"
            className="bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
          />
          <select
            value={deptSlug}
            onChange={(e) => setDeptSlug(e.target.value)}
            className="bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-sky/40"
          >
            <option value="">Department (optional)</option>
            {DEPT_SLUGS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Link URL (optional)"
            className="bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
          />
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Link label (optional)"
            className="bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
          />
        </div>

        {/* Post button */}
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={posting || !content.trim()}
            className="px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: selectedType.color }}
          >
            {posting ? 'Posting…' : `${selectedType.emoji} Post`}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center py-20">
          <p className="text-brand-steel font-black text-xs uppercase tracking-widest animate-pulse">Loading pulse…</p>
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-brand-steel font-black text-xs uppercase tracking-widest">No posts yet. Be the first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedPosts.map((post) => (
            <PostCard
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
