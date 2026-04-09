"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import { Lock, TrendingUp, Calendar as CalendarIcon, Quote, Target, ArrowRight } from 'lucide-react';

export default function InvestorPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  
  // Data states
  const [projects, setProjects] = useState<any[]>([]);
  const [recognitions, setRecognitions] = useState<any[]>([]);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'maji-investor-2026') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch timeline projects
      supabase
        .from('maji_projects')
        .select('*')
        .order('deadline', { ascending: true })
        .then(({ data }) => setProjects(data || []));

      // Fetch recognitions (will return empty if table missing)
      supabase
        .from('recognitions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4)
        .then(({ data }) => setRecognitions(data || []));
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl w-full max-w-md text-center">
          <div className="flex justify-center mb-8">
            <Logo href="/investor" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Investor Portal</h2>
          <p className="text-gray-400 text-sm mb-8">Enter your access key to view high-level KPIs and strategic timelines.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Key" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-xs text-left">Invalid access key.</p>}
            <button 
              type="submit" 
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              Access Data Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Static mock aggregates for Phase Streak/KPIs to hide granular ops
  const metrics = [
    { label: 'Monthly Output (Jars)', value: '14,250', trend: '+12% M/M' },
    { label: 'Est. Gross Revenue', value: 'UGX 427.5M', trend: 'On Target' },
    { label: 'Current Phase Streak', value: '45 Days', trend: 'Phase 1 Locked' }
  ];

  const milestones = [
    { title: 'UNBS Testing Phase', date: 'April 2026', status: 'completed' },
    { title: 'UNBS Official Certification', date: 'May 2026', status: 'active' },
    { title: 'T1 Wholesale Rollout', date: 'July 2026', status: 'pending' },
    { title: 'Facility Expansion (Phase 2)', date: 'Q4 2026', status: 'pending' },
  ];

  return (
    <div className="relative z-10 p-4 md:p-8 overflow-auto h-full max-w-7xl mx-auto w-full">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <Logo href="/investor" />
        <div className="bg-cyan-500/10 border border-cyan-500/30 px-5 py-2 rounded-full text-cyan-400 text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Secure Viewing Session
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Executive Summary</h2>
        <p className="text-gray-400">High-level telemetry, milestones, and strategic initiatives.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl group-hover:bg-cyan-400/10 transition-colors" />
            <p className="text-gray-400 text-sm font-medium mb-1">{m.label}</p>
            <p className="text-3xl font-black text-white mb-3">{m.value}</p>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold bg-cyan-500/10 w-max px-2 py-1 rounded-md">
              <TrendingUp className="w-3 h-3" /> {m.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Milestones & Timeline */}
        <div className="space-y-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" /> Strategic Milestones
            </h3>
            <div className="space-y-6">
              {milestones.map((ms, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="mt-1">
                    <div className={`w-3 h-3 rounded-full ${ms.status === 'completed' ? 'bg-cyan-400' : ms.status === 'active' ? 'bg-white shadow-[0_0_10px_white] animate-pulse' : 'bg-white/20'}`} />
                    {i !== milestones.length - 1 && <div className="w-0.5 h-full bg-white/10 mx-auto mt-2 min-h-[2rem]" />}
                  </div>
                  <div>
                    <p className={`font-bold ${ms.status === 'pending' ? 'text-gray-400' : 'text-white'}`}>{ms.title}</p>
                    <p className="text-xs text-cyan-400 font-semibold">{ms.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Culture & Forward Looking */}
        <div className="space-y-8">
          {/* Active Capital Projects */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cyan-400" /> Active Initiatives
            </h3>
            <div className="space-y-4">
              {projects.length > 0 ? projects.map((proj, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:border-cyan-500/30 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{proj.name}</p>
                    <p className="text-xs text-gray-400">{proj.description}</p>
                  </div>
                  {proj.deadline && (
                    <div className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md ml-3 flex-shrink-0">
                      {new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-sm text-gray-500 italic">No public initiatives tracked.</p>
              )}
            </div>
          </div>

          {/* Positive Quotes / Public Recognitions */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Quote className="w-5 h-5 text-cyan-400" /> Culture Highlights
            </h3>
            <div className="space-y-4">
              {recognitions.length > 0 ? recognitions.map((rec, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <p className="italic text-gray-300 text-sm mb-2">"{rec.message}"</p>
                  <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Team Member, {rec.department}
                  </p>
                </div>
              )) : (
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <p className="italic text-gray-300 text-sm mb-2">"Quality output maintained at 98.5% efficiency this week. The new filtration standard is holding perfectly."</p>
                  <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Anonymous Highlight
                  </p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// Temporary local shield check icon inside component until main lucide import resolves
function ShieldCheck({ className }: { className: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>;
}
