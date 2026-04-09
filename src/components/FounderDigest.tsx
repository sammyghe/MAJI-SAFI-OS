"use client";

import { Calendar, CheckCircle2, Clock, Mail, Milestone, Sparkles } from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { sendEmailNotification } from "@/lib/telegram";
import { useState } from "react";

interface Project {
  name: string;
  description: string;
  owner: string;
  deadline: string | null;
  status: string;
}

interface FounderDigestProps {
  projects: Project[];
  userName: string;
}

export default function FounderDigest({ projects, userName }: FounderDigestProps) {
  const [sending, setSending] = useState(false);

  const activeProjects = projects.filter(p => p.status === 'active');
  const upcoming = activeProjects
    .filter(p => p.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  const handleSendEmail = async () => {
    setSending(true);
    const subject = `Strategic Digest: ${format(new Date(), 'MMMM d, yyyy')}`;
    const body = `
Hello ${userName},

Here is your Strategic Ops Overview:

ACTIVE PROJECTS (${activeProjects.length}):
${activeProjects.map(p => `- ${p.name} (Lead: ${p.owner})`).join('\n')}

WHAT'S NEXT:
${upcoming.length > 0 
  ? `Next major milestone: ${upcoming[0].name} due ${format(new Date(upcoming[0].deadline!), 'MMM d')}` 
  : 'All systems clear. Check back later for new vectors.'}

Regards,
MajiSafi OS Intelligence
    `;
    
    await sendEmailNotification(subject, body);
    setTimeout(() => {
      setSending(false);
      alert("Digest dispatched to console/email mock!");
    }, 800);
  };

  return (
    <div className="glass-panel overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-deep/60 to-brand-navy/40 border border-white/10 shadow-2xl relative">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Sparkles className="w-24 h-24 text-brand-sky" />
      </div>

      <div className="p-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-brand-sky/20 text-brand-sky">
                <Milestone className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-white italic uppercase tracking-wider">Founder's Strategic Digest</h2>
            </div>
            <p className="text-brand-steel text-xs font-bold uppercase tracking-[0.2em]">Roadmap Clarity & Next Steps</p>
          </div>

          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-sky text-brand-deep font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-sky/20 active:scale-95 disabled:opacity-50"
          >
            <Mail className={`w-4 h-4 ${sending ? 'animate-bounce' : ''}`} />
            {sending ? 'Dispatching...' : 'Email Digest'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Pulse */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-brand-steel uppercase tracking-[0.3em] flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Project Pulse
            </h3>
            <div className="space-y-3">
              {activeProjects.slice(0, 3).map((project, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 group hover:border-brand-sky/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center text-brand-sky font-black">
                    0{idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white italic uppercase">{project.name}</p>
                    <p className="text-[9px] text-brand-steel font-bold uppercase tracking-widest leading-none mt-1">Lead: {project.owner}</p>
                  </div>
                </div>
              ))}
              {activeProjects.length > 3 && (
                <p className="text-[10px] text-brand-sky font-black italic ml-2">+{activeProjects.length - 3} more active tracks</p>
              )}
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-brand-steel uppercase tracking-[0.3em] flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Critical Path / What's Next
            </h3>
            <div className="p-6 rounded-[2rem] bg-brand-navy/40 border border-brand-sky/10 relative overflow-hidden group">
              <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <CheckCircle2 className="w-20 h-20 text-white" />
              </div>
              
              {upcoming.length > 0 ? (
                <div className="relative z-10">
                  <p className="text-brand-sky font-black text-xs uppercase tracking-widest mb-1 italic">Immediate Priority</p>
                  <h4 className="text-2xl font-black text-white italic tracking-tighter leading-tight mb-4 uppercase">
                    {upcoming[0].name}
                  </h4>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-navy rounded-xl border border-white/5 w-fit">
                    <Clock className="w-3 h-3 text-brand-steel" />
                    <span className="text-[10px] font-black text-brand-pale uppercase tracking-widest">
                      Due {format(new Date(upcoming[0].deadline!), 'MMMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-brand-steel font-black text-xs uppercase italic tracking-widest py-4">No upcoming deadlines detected.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
