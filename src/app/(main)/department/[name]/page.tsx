import { supabase } from '@/lib/supabase';
import { 
  Layers, 
  CheckCircle, 
  Activity, 
  FileText, 
  Beaker, 
  Plus, 
  MessageSquare, 
  Droplets, 
  ShieldCheck, 
  ArrowUpRight,
  User,
  ExternalLink,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { format, isValid } from 'date-fns';
import AddLogForm from '@/components/AddLogForm';
import DeptRealtimeLogs from './DeptRealtimeLogs';
import RecognitionsWidget from '@/components/RecognitionsWidget';
import { DEPARTMENTS_CONFIG } from '@/lib/deptConfig';

export default async function DepartmentPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ name: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const name = resolvedParams.name;
  const tgId = resolvedSearchParams?.tgId as string || '';
  
  const isFounder = tgId === '6868392834' || tgId === '8457004704';
  const decodedName = decodeURIComponent(name).toLowerCase();
  
  const config = (DEPARTMENTS_CONFIG as any)[decodedName];
  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen text-brand-steel font-black uppercase tracking-widest italic">
        Sector Not Found
      </div>
    );
  }

  const capitalizedName = config.title.split(' ')[0];

  // Fetch recent logs based on the department config
  let logs: any[] = [];
  try {
    const { data } = await supabase
      .from(config.table)
      .select('*')
      .order('date', { ascending: false })
      .limit(7);
    logs = data || [];
  } catch (e) {
    console.error("Missing table fallback for:", config.table);
  }

  // Fetch active projects
  let projects: any[] = [];
  try {
    const { data } = await supabase
      .from('maji_projects')
      .select('*')
      .eq('status', 'active')
      .eq('department', decodedName)
      .limit(4);
    projects = data || [];
  } catch (e) {
    console.error("Projects query error");
  }

  return (
    <div className="w-full h-full font-sans selection:bg-brand-sky/30 relative">
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10 space-y-10">
        
        {/* Hub Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <Logo href={`/?tgId=${tgId}&dept=${decodedName}`} />
          
          <div className="flex items-center gap-3">
            <button className="glass-panel flex items-center gap-3 px-6 py-3 rounded-2xl bg-brand-navy/30 border-white/5 hover:border-brand-sky/30 transition-all duration-500 text-brand-steel hover:text-white group">
              <MessageSquare className="w-4 h-4 text-brand-sky" />
              <span className="font-black text-xs uppercase tracking-widest italic">Mission Q&A</span>
            </button>
            <div className="glass-panel px-5 py-3 rounded-2xl border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-sky animate-pulse" />
              <span className="text-[10px] font-black text-brand-steel uppercase tracking-widest">{config.title} Active</span>
            </div>
          </div>
        </div>

        {/* Hero "Blended Frame" Sector */}
        <div className="relative overflow-hidden rounded-[3rem] bg-brand-deep/40 border border-white/5 p-8 lg:p-12 shadow-2xl">
          {/* Background Blended Team Photo */}
          <div className="absolute inset-0 z-0">
            <img 
              src={config.head.img} 
              alt={config.head.name} 
              className="w-full h-full object-cover object-center opacity-10 blur-sm scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-deep via-brand-deep/60 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-navy rounded-2xl border border-white/10">
                  <config.icon className="w-8 h-8 text-brand-sky" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">
                  {config.title}
                </h1>
              </div>
              <p className="text-brand-steel font-bold text-lg leading-relaxed max-w-xl">
                {config.description}
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                {config.sops.map((sop: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-brand-sky uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer group">
                    <FileText className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                    {sop}
                  </div>
                ))}
              </div>
            </div>

            {/* Department Head Spotlight */}
            <div className="flex items-center gap-6 glass-panel p-6 rounded-[2.5rem] bg-brand-navy/40 border-white/10">
              <div className="relative">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-brand-sky/30 shadow-2xl">
                  <img src={config.head.img} alt={config.head.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 p-1.5 bg-brand-sky rounded-xl border-4 border-brand-navy">
                  <ShieldCheck className="w-4 h-4 text-brand-deep" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-brand-sky uppercase tracking-[0.3em] mb-1">Sector Lead</p>
                <h3 className="text-xl font-black text-white uppercase italic">{config.head.name}</h3>
                <p className="text-sm font-bold text-brand-steel">{config.head.role}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Activity Stream */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Live Telemetry & Add Log */}
            <div className="glass-panel p-8 rounded-[3rem] bg-brand-deep/30 space-y-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
                    <Activity className="w-6 h-6 text-brand-sky" /> Log Pipeline
                  </h2>
                  <p className="text-[10px] font-bold text-brand-steel uppercase tracking-widest mt-1">Real-time Authorized Entries</p>
                </div>
                <AddLogForm department={decodedName} tgId={tgId} />
              </div>

              <DeptRealtimeLogs department={decodedName} initialLogs={logs} />
            </div>

            {/* Recognitions */}
            <RecognitionsWidget tgId={tgId} />
          </div>

          {/* Strategic Info Column */}
          <div className="space-y-10">
            
            {/* Active Projects Cards */}
            <div className="glass-panel p-8 rounded-[3rem] bg-brand-navy/20 border-brand-sky/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                  <Layers className="w-5 h-5 text-brand-sky" /> Strategic Ops
                </h2>
                <div className="p-2 rounded-xl bg-white/5 text-brand-steel">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-4">
                {projects.length > 0 ? projects.map((proj, idx) => (
                  <div key={idx} className="group p-5 rounded-2xl bg-brand-deep/40 border border-white/5 hover:border-brand-sky/20 transition-all duration-500 cursor-pointer">
                    <h3 className="font-black text-white text-sm uppercase italic mb-3 group-hover:text-brand-sky transition-colors">{proj.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-brand-steel" />
                        <span className="text-[9px] font-black text-brand-steel uppercase tracking-widest">{proj.owner}</span>
                      </div>
                      <span className="text-[9px] font-black text-brand-sky bg-brand-sky/10 px-2 py-1 rounded-lg uppercase tracking-widest">In Motion</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <p className="text-[10px] font-black text-brand-steel uppercase tracking-[0.2em] italic">No Active Vectors</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transparency / Global Access */}
            <div className="glass-panel p-8 rounded-[3rem] bg-brand-deep/60 border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] group-hover:scale-125 transition-all duration-1000">
                <Lock className="w-24 h-24 text-white" />
              </div>
              <h3 className="text-sm font-black text-white uppercase italic mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorized Access
              </h3>
              <p className="text-[11px] font-bold text-brand-steel leading-relaxed mb-6">
                This sector is currently under {isFounder ? 'Foundational Overseer' : 'Standard Operative'} authorization. All telemetry is hashed and logged for transparency.
              </p>
              <Link href="/" className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black text-white uppercase tracking-[0.3em] transition-all">
                <ExternalLink className="w-3 h-3" />
                Global Manifest
              </Link>
            </div>

            {/* Water droplet accents decoration */}
            <div className="flex justify-center gap-8 opacity-20">
               <Droplets className="w-4 h-4 text-brand-sky" />
               <Droplets className="w-6 h-6 text-brand-sky animate-bounce" />
               <Droplets className="w-4 h-4 text-brand-sky" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

