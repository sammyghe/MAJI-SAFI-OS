'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Users2, Play, Square, ChevronRight, ChevronDown, CheckCircle2, Timer, Star } from 'lucide-react';
import Scorecard from '@/components/Scorecard';

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  facilitator: string | null;
  attendees: string[] | null;
  rating: number | null;
}

interface RoundtableEntry {
  id: string;
  person_name: string;
  entry_type: 'status' | 'headline' | 'todo' | 'issue';
  content: string;
  is_done: boolean;
}

const SECTIONS = [
  { id: 'checkin',     label: 'Check-In',       minutes: 5,  desc: 'Good news — personal and professional' },
  { id: 'scorecard',  label: 'Scorecard',       minutes: 5,  desc: 'Review KPIs — red, yellow, or green' },
  { id: 'rocks',      label: 'Rock Review',     minutes: 5,  desc: 'On track or off track — no discussion yet' },
  { id: 'headlines',  label: 'Customer/Employee Headlines', minutes: 5, desc: 'Good and bad news — brief' },
  { id: 'todos',      label: 'To-Do List',      minutes: 5,  desc: 'Review last week\'s todos — done or not done' },
  { id: 'roundtable', label: 'Roundtable',      minutes: 5,  desc: 'What\'s the most important thing this week?' },
  { id: 'ids',        label: 'IDS',             minutes: 60, desc: 'Identify, Discuss, Solve the most important issues' },
  { id: 'conclude',   label: 'Conclude',        minutes: 5,  desc: 'Cascade messages, rate the meeting (1–10)' },
];

function pad(n: number) { return String(n).padStart(2, '0'); }

function SectionTimer({ minutes, active }: { minutes: number; active: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  useEffect(() => { if (active) setElapsed(0); }, [active]);

  const target = minutes * 60;
  const over = elapsed > target;
  const remaining = target - elapsed;
  const absRemaining = Math.abs(remaining);
  const h = Math.floor(absRemaining / 3600);
  const m = Math.floor((absRemaining % 3600) / 60);
  const s = absRemaining % 60;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-black tabular-nums ${over ? 'text-red-400' : active ? 'text-[#7EC8E3]' : 'text-slate-600'}`}>
      <Timer className="w-3 h-3" />
      {over ? '+' : ''}{h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
      <span className="text-[10px] font-normal text-slate-600">/{minutes}:00</span>
    </div>
  );
}

export default function MeetingPage() {
  const { user } = useAuth();
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [expandedSection, setExpandedSection] = useState(0);
  const [entries, setEntries] = useState<RoundtableEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [personName, setPersonName] = useState(user?.name ?? '');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [concluding, setConcluding] = useState(false);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    setPersonName(user?.name ?? '');
    loadMeetings();
  }, [user]);

  const loadMeetings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('location_id', 'buziga')
      .eq('meeting_type', 'level10')
      .order('scheduled_at', { ascending: false })
      .limit(10);
    const all = data ?? [];
    const active = all.find((m) => m.started_at && !m.ended_at) ?? null;
    setActiveMeeting(active);
    setPastMeetings(all.filter((m) => m.ended_at));
    setLoading(false);
  };

  const loadEntries = async (meetingId: string) => {
    const { data } = await supabase
      .from('roundtable_entries')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at');
    setEntries(data ?? []);
  };

  const startMeeting = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        location_id: 'buziga',
        meeting_type: 'level10',
        title: `Level 10 — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        scheduled_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        facilitator: user?.name ?? 'Unknown',
        attendees: [user?.name ?? ''],
      })
      .select()
      .single();
    if (!error && data) {
      setActiveMeeting(data);
      setActiveSection(0);
      setExpandedSection(0);
    }
  };

  const addEntry = async (entryType: RoundtableEntry['entry_type']) => {
    if (!activeMeeting || !newEntry.trim()) return;
    const { data } = await supabase
      .from('roundtable_entries')
      .insert({
        meeting_id: activeMeeting.id,
        person_name: personName || (user?.name ?? 'Unknown'),
        entry_type: entryType,
        content: newEntry.trim(),
      })
      .select()
      .single();
    if (data) setEntries((prev) => [...prev, data]);
    setNewEntry('');
  };

  const toggleEntryDone = async (entry: RoundtableEntry) => {
    await supabase.from('roundtable_entries').update({ is_done: !entry.is_done }).eq('id', entry.id);
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, is_done: !e.is_done } : e));
  };

  const concludeMeeting = async () => {
    if (!activeMeeting) return;
    setConcluding(true);
    await supabase.from('meetings').update({
      ended_at: new Date().toISOString(),
      rating: rating || null,
    }).eq('id', activeMeeting.id);
    setConcluding(false);
    setActiveMeeting(null);
    setRating(0);
    loadMeetings();
  };

  useEffect(() => {
    if (activeMeeting) loadEntries(activeMeeting.id);
  }, [activeMeeting]);

  if (loading) {
    return (
      <div className="px-5 py-6">
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!activeMeeting) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Users2 className="w-6 h-6 text-[#0077B6]" />
            Level 10 Meeting
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
            90 minutes · Weekly · Structured rhythm
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-slate-400 text-sm">No active meeting. Start a new Level 10.</p>
          <div className="text-left space-y-1.5">
            {SECTIONS.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-slate-200 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-700 w-4">{i + 1}</span>
                  <p className="text-xs text-slate-300">{s.label}</p>
                </div>
                <span className="text-[10px] text-slate-600">{s.minutes} min</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5 font-black">
              <p className="text-xs text-slate-400">Total</p>
              <span className="text-xs text-[#7EC8E3]">90 min</span>
            </div>
          </div>
          <button
            onClick={startMeeting}
            className="flex items-center gap-2 px-6 py-3 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-sm font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30 transition-colors mx-auto"
          >
            <Play className="w-4 h-4" />
            Start Meeting
          </button>
        </div>

        {pastMeetings.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Past Meetings</p>
            {pastMeetings.slice(0, 5).map((m) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{m.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(m.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {m.facilitator && ` · ${m.facilitator}`}
                  </p>
                </div>
                {m.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                    <span className="text-xs font-black text-amber-400">{m.rating}/10</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentSectionType = SECTIONS[activeSection]?.id;
  const todoEntries = entries.filter((e) => e.entry_type === 'todo');
  const headlineEntries = entries.filter((e) => e.entry_type === 'headline');
  const roundtableEntries = entries.filter((e) => e.entry_type === 'status');

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white uppercase tracking-tight">{activeMeeting.title}</h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest">
            In progress · Facilitator: {activeMeeting.facilitator}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SectionTimer minutes={SECTIONS[activeSection]?.minutes ?? 5} active={true} />
        </div>
      </div>

      {/* Section progress dots */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setActiveSection(i); setExpandedSection(i); }}
            className={`w-6 h-1.5 rounded-full transition-all ${i < activeSection ? 'bg-emerald-500' : i === activeSection ? 'bg-[#0077B6]' : 'bg-zinc-700'}`}
            title={s.label}
          />
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {SECTIONS.map((section, i) => {
          const isActive = i === activeSection;
          const isDone = i < activeSection;
          const isExpanded = i === expandedSection;

          return (
            <div
              key={section.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                isActive ? 'border-[#0077B6]/30 bg-[#0077B6]/5' : isDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-200 bg-white/50'
              }`}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedSection(isExpanded ? -1 : i)}
              >
                <span className={`text-[10px] font-black w-4 flex-shrink-0 ${isActive ? 'text-[#0077B6]' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isDone ? '✓' : i + 1}
                </span>
                <div className="flex-1">
                  <p className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                    {section.label}
                  </p>
                  {isExpanded && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{section.desc}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {isActive && <SectionTimer minutes={section.minutes} active={true} />}
                  {!isActive && <span className="text-[10px] text-slate-700">{section.minutes}m</span>}
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-200/40 pt-3 space-y-3">
                  {/* Scorecard section */}
                  {section.id === 'scorecard' && (
                    <Scorecard compact showHeader={false} />
                  )}

                  {/* Headlines / Todos / Roundtable input */}
                  {['headlines', 'todos', 'roundtable'].includes(section.id) && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                          placeholder="Your name"
                          className="w-28 bg-slate-100 border border-slate-200 rounded-lg px-2 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                        />
                        <input
                          value={newEntry}
                          onChange={(e) => setNewEntry(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addEntry(section.id === 'todos' ? 'todo' : section.id === 'headlines' ? 'headline' : 'status'); }}
                          placeholder={section.id === 'todos' ? 'Add to-do…' : section.id === 'headlines' ? 'Add headline…' : 'Share status…'}
                          className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                        />
                        <button
                          onClick={() => addEntry(section.id === 'todos' ? 'todo' : section.id === 'headlines' ? 'headline' : 'status')}
                          disabled={!newEntry.trim()}
                          className="px-3 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30 disabled:opacity-40 transition-colors"
                        >
                          Add
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(section.id === 'todos' ? todoEntries : section.id === 'headlines' ? headlineEntries : roundtableEntries).map((e) => (
                          <div key={e.id} className="flex items-start gap-2 py-1">
                            <button onClick={() => toggleEntryDone(e)} className="flex-shrink-0 mt-0.5">
                              <CheckCircle2 className={`w-3.5 h-3.5 ${e.is_done ? 'text-emerald-400' : 'text-slate-600'}`} />
                            </button>
                            <div>
                              <span className={`text-xs ${e.is_done ? 'line-through text-slate-600' : 'text-slate-300'}`}>{e.content}</span>
                              <span className="text-[10px] text-slate-600 ml-2">{e.person_name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conclude — rating */}
                  {section.id === 'conclude' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rate this meeting (1–10)</p>
                        <div className="flex gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              onMouseEnter={() => setHoverRating(n)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(n)}
                              className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                                n <= (hoverRating || rating)
                                  ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                  : 'bg-slate-100 border border-slate-200 text-slate-500'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={concludeMeeting}
                        disabled={concluding}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-sm font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/30 disabled:opacity-40 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        {concluding ? 'Saving…' : 'End Meeting'}
                      </button>
                    </div>
                  )}

                  {/* Next section button */}
                  {isActive && i < SECTIONS.length - 1 && section.id !== 'conclude' && (
                    <button
                      onClick={() => { setActiveSection(i + 1); setExpandedSection(i + 1); }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-300 uppercase tracking-widest hover:bg-zinc-700 transition-colors mt-2"
                    >
                      Next: {SECTIONS[i + 1].label}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
