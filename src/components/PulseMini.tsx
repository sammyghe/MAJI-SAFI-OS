"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface PulsePost {
  id: number;
  post_type: string;
  content: string;
  author_role: string;
  department_slug: string | null;
  color: string;
  emoji: string;
  reactions: Record<string, number>;
  created_at: string;
}

export default function PulseMini() {
  const [posts, setPosts] = useState<PulsePost[]>([]);

  useEffect(() => {
    supabase
      .from('pulse_posts')
      .select('id, post_type, content, author_role, department_slug, color, emoji, reactions, created_at')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setPosts(data as PulsePost[]);
      });

    const channel = supabase
      .channel('pulse_mini_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_posts' }, (payload) => {
        setPosts((prev) => [payload.new as PulsePost, ...prev].slice(0, 3));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div
      className="overflow-hidden p-8 rounded-[2.5rem] bg-brand-deep/40 backdrop-blur-xl border border-brand-sky/15"
      style={{ boxShadow: '0 0 40px rgba(125,160,202,0.07), inset 0 1px 0 rgba(193,232,255,0.06)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <h2 className="text-xl font-black text-white italic uppercase">Pulse</h2>
          <p className="text-[10px] font-bold text-brand-steel uppercase tracking-widest ml-1">Company Feed</p>
        </div>
        <Link
          href="/pulse"
          className="text-[10px] font-black text-brand-sky uppercase tracking-widest hover:text-brand-pale transition-colors"
        >
          View All →
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-brand-steel font-black text-xs uppercase tracking-widest italic text-center py-8">
          No posts yet.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-brand-navy/10 hover:bg-brand-navy/20 transition-colors"
              style={{ borderLeftWidth: '3px', borderLeftColor: post.color, borderLeftStyle: 'solid' }}
            >
              <span className="text-lg flex-shrink-0">{post.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white leading-relaxed line-clamp-2">{post.content}</p>
                <p className="text-[10px] text-brand-steel mt-1 font-black uppercase tracking-widest">
                  {post.author_role} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
