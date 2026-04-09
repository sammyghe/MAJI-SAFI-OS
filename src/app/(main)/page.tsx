"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Target, TrendingUp, DollarSign, RefreshCw, Layers, Calendar, User, Droplets, Settings, ShieldCheck, BadgeDollarSign, Package, Wallet, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import CountUp from 'react-countup';
import { format, isValid } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThreeBackground from '@/components/ThreeBackground';
import RealtimeManager from '@/components/RealtimeManager';
import RecognitionsWidget from '@/components/RecognitionsWidget';
import TransparencyFeed from '@/components/TransparencyFeed';


interface DailyLog {
  date: string;
  jars_produced: number;
  cash_collected_ugx: number;
  quality_status: string;
  logged_by: string;
}

interface Phase {
  phase_number: number;
  consecutive_days: number;
  active: boolean;
}

interface Project {
  name: string;
  description: string;
  owner: string;
  deadline: string | null;
  status: string;
}

export default function Dashboard() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [chartData, setChartData] = useState<{ date: string, jars: number }[]>([]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [tgId, setTgId] = useState<string>('6868392834');
  const [userDept, setUserDept] = useState<string>('operations');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('tgId')) setTgId(params.get('tgId')!);
      if (params.has('dept')) setUserDept(params.get('dept')!);
    }
  }, []);

  const isFounder = tgId === '6868392834' || tgId === '8457004704';

  const fetchData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const { data: logData } = await supabase
        .from('maji_daily_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      setLog(logData);

      const { data: last7Logs } = await supabase
        .from('maji_daily_logs')
        .select('date, jars_produced')
        .order('date', { ascending: false })
        .limit(7);
      
      if (last7Logs) {
        const formattedChart = [...last7Logs].reverse().map(d => ({
          date: format(new Date(d.date), 'MMM d'),
          jars: d.jars_produced
        }));
        setChartData(formattedChart);
      }

      const { data: phaseData } = await supabase
        .from('maji_phase')
        .select('*')
        .eq('active', true)
        .single();
      
      setPhase(phaseData);

      const { data: projectsData } = await supabase
        .from('maji_projects')
        .select('*')
        .eq('status', 'active');
      
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const TARGET_JARS = 500;
  const BREAK_EVEN = 820000;

  return (
    <div className="space-y-10 selection:bg-brand-sky/30">
      <ThreeBackground />
      <RealtimeManager
        onLogsChange={() => fetchData()}
        onProjectsChange={() => fetchData()}
      />
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Command <span className="text-brand-sky">Center</span>
          </h1>
          <p className="text-brand-steel font-bold tracking-widest uppercase text-xs mt-1">Real-time Operations Overview</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-navy/30 border border-white/5 hover:border-brand-sky/30 hover:bg-brand-navy/50 transition-all duration-300 disabled:opacity-50 group glass-panel"
          >
            <RefreshCw className={`w-4 h-4 text-brand-sky ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
            <span className="font-bold text-xs text-white uppercase tracking-wider">Sync State</span>
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-navy/20 rounded-2xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-brand-steel uppercase tracking-widest">Live Network</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <Droplets className="w-16 h-16 text-brand-sky animate-bounce relative z-10" />
            <div className="absolute inset-0 bg-brand-sky blur-3xl opacity-20 animate-pulse rounded-full"></div>
          </div>
          <p className="text-brand-steel animate-pulse font-black text-xs tracking-[0.3em] uppercase">Purifying Data Streams...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-1000">
          
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Jars Produced Card (Liquid Design) */}
            {log && (
              <div className="group relative overflow-hidden rounded-[2.5rem] bg-brand-deep/30 border border-brand-sky/10 p-8 shadow-2xl transition-all duration-500 hover:border-brand-sky/30 animate-card-glow">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-brand-navy/50 text-brand-sky border border-brand-sky/10">
                        <Package className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-brand-steel uppercase tracking-widest text-xs">Volume Output</h3>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase">
                      Target 500
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-7xl font-black tracking-tighter text-white drop-shadow-lg">
                      <CountUp end={log.jars_produced} duration={2} />
                    </span>
                    <span className="text-brand-steel font-bold text-xl mb-2 opacity-50 italic">JARS</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-brand-steel">
                      <span>Performance Gap</span>
                      <span className="text-brand-sky">{Math.min(Math.round((log.jars_produced / TARGET_JARS) * 100), 100)}%</span>
                    </div>
                    
                    {/* Liquid Progress Bar */}
                    <div className="relative h-10 w-full bg-brand-deep/50 rounded-2xl overflow-hidden border border-white/5 shadow-inner">
                      <div 
                        className="absolute inset-0 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((log.jars_produced / TARGET_JARS) * 100, 100)}%` }}
                      >
                        {/* Wave Layer 1 */}
                        <div className="absolute inset-0 bg-brand-sky/20 animate-wave opacity-50" 
                             style={{ background: 'linear-gradient(90deg, transparent, rgba(193, 232, 255, 0.4), transparent)', backgroundSize: '200% 100%' }} />
                        {/* Fill Base */}
                        <div className={`h-full w-full opacity-30 ${log.jars_produced >= TARGET_JARS ? 'bg-emerald-400' : 'bg-brand-sky'}`} />
                        {/* Highlight */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Tracking Card */}
            {log && (
              <div className="group relative overflow-hidden rounded-[2.5rem] bg-brand-deep/30 border border-brand-sky/10 p-8 shadow-2xl transition-all duration-500 hover:border-brand-sky/30 animate-card-glow">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-brand-navy/50 text-brand-sky border border-brand-sky/10">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-brand-steel uppercase tracking-widest text-xs">Revenue Flow</h3>
                    </div>
                    <Link href="#" className="p-2 rounded-xl bg-white/5 text-brand-steel hover:text-white transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-2xl font-black text-brand-steel italic">UGX</span>
                    <span className="text-7xl font-black tracking-tighter text-white drop-shadow-lg leading-none">
                      <CountUp end={log.cash_collected_ugx / 1000} duration={2} decimals={1} />
                      <span className="text-4xl text-brand-sky italic">k</span>
                    </span>
                  </div>

                  <div className="p-4 rounded-3xl bg-brand-navy/20 border border-white/5 flex justify-between items-center backdrop-blur-sm">
                    <div>
                      <p className="text-[10px] font-black text-brand-steel uppercase tracking-[0.2em] mb-1">Status Report</p>
                      <p className={`text-sm font-black uppercase italic ${log.cash_collected_ugx >= BREAK_EVEN ? 'text-emerald-400' : 'text-brand-sky'}`}>
                        {log.cash_collected_ugx >= BREAK_EVEN ? 'Profitable Cycle' : 'Growth Phase'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-brand-steel uppercase tracking-[0.2em] mb-1">Threshold</p>
                      <p className="text-white font-black italic">820k</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phase streak card */}
            {phase && (
              <div className="group relative overflow-hidden rounded-[2.5rem] bg-brand-navy/20 border border-brand-sky/10 p-8 shadow-2xl transition-all duration-500 hover:border-brand-sky/30 animate-card-glow">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-brand-steel/10 blur-[80px] rounded-full group-hover:bg-brand-sky/20 transition-all duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-brand-deep/50 text-brand-pale border border-white/5">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-brand-steel uppercase tracking-widest text-xs">Streaks</h3>
                    </div>
                    {phase.active && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-brand-sky/10 rounded-full border border-brand-sky/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-sky animate-ping" />
                        <span className="text-[10px] font-black text-brand-sky uppercase tracking-widest">Active Cycle</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
                      <CountUp end={phase.consecutive_days} duration={2.5} />
                    </span>
                    <span className="text-brand-steel font-black text-xl italic tracking-widest opacity-40">DAYS</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[11px] font-black text-brand-sky uppercase tracking-[0.2em]">
                    <ShieldCheck className="w-4 h-4" />
                    Phase {phase.phase_number} Compliance
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trends Section */}
            <div className="glass-panel overflow-hidden p-8 rounded-[2.5rem] bg-brand-deep/30">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-brand-navy/50 text-brand-sky">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">Output Trend</h2>
                    <p className="text-[10px] font-bold text-brand-steel uppercase tracking-widest">Last 7 Cycle Performance</p>
                  </div>
                </div>
              </div>
              
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorJars" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C1E8FF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#C1E8FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(84, 131, 179, 0.1)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#5483B3" 
                      fontSize={10} 
                      fontWeight="900" 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#5483B3" 
                      fontSize={10} 
                      fontWeight="900"
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#021024', 
                        border: '1px solid rgba(193, 232, 255, 0.1)',
                        borderRadius: '1.2rem',
                        padding: '12px'
                      }}
                      itemStyle={{ color: '#C1E8FF', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="jars" 
                      stroke="#C1E8FF" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorJars)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Projects Selection List */}
            <div className="glass-panel overflow-hidden p-8 rounded-[2.5rem] bg-brand-deep/30 flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-brand-navy/50 text-brand-sky">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">Strategic Ops</h2>
                    <p className="text-[10px] font-bold text-brand-steel uppercase tracking-widest">Active Development Tracks</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-brand-navy/30 rounded-2xl border border-white/5 text-[10px] font-black text-brand-sky italic uppercase tracking-widest">
                  {projects.length} Vectors
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                {projects.length === 0 ? (
                  <div className="py-20 text-center">
                    <Layers className="w-12 h-12 text-brand-navy mx-auto mb-4 opacity-30" />
                    <p className="text-brand-steel font-black text-xs uppercase tracking-widest italic">All systems clear. No active vectors.</p>
                  </div>
                ) : (
                  projects.map((project, idx) => (
                    <div key={idx} className="group p-5 rounded-3xl bg-brand-navy/20 border border-white/5 hover:bg-brand-navy/40 hover:border-brand-sky/20 transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-white italic uppercase text-sm tracking-vantage leading-tight">
                          {project.name}
                        </h4>
                        <div className="p-2 rounded-xl bg-brand-deep/50 text-brand-sky opacity-0 group-hover:opacity-100 transition-all">
                          <ArrowUpRight className="w-3 h-3" />
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-brand-steel leading-relaxed mb-4 line-clamp-2">
                        {project.description || "System expansion and operational optimization track."}
                      </p>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-brand-sky" />
                          <span className="text-[9px] font-black text-brand-sky uppercase tracking-widest">{project.owner}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-brand-steel" />
                          <span className="text-[9px] font-black text-brand-steel uppercase tracking-widest">
                            {project.deadline ? format(new Date(project.deadline), 'MMM d') : 'OPEN'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <RecognitionsWidget tgId={tgId} />
          <TransparencyFeed />

        </div>
      )}
    </div>
  );
}


