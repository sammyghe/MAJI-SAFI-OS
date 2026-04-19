"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, RefreshCw, Shield, Bell, Zap, Users, QrCode, Building2, GitBranch } from 'lucide-react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

interface CompanySetting {
  key: string;
  value: string | boolean | number;
  label: string;
  description: string;
}

interface PinEntry {
  role: string;
  pin: string;
  dept: string;
}

const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySetting[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // PIN management
  const [pins, setPins] = useState<PinEntry[]>([{ role: '', pin: '', dept: '' }]);
  const [showQR, setShowQR] = useState<string | null>(null);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  useEffect(() => {
    // PWA install prompt
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setPwaInstalled(true));

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    fetchSettings();
    fetchTeam();
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('company_settings').select('*').order('key');
    if (data) {
      setSettings(data.map((row: { key: string; value: unknown; label: string; description: string }) => ({
        key: row.key,
        value: (row.value !== null && row.value !== undefined && typeof row.value === 'object')
          ? JSON.stringify(row.value)
          : String(row.value ?? ''),
        label: row.label,
        description: row.description,
      })));
    }
    setLoading(false);
  };

  const fetchTeam = async () => {
    const { data } = await supabase
      .from('team_members')
      .select('id, name, role, department_slug, departments, access_level, contract_status')
      .eq('location_id', 'buziga')
      .in('contract_status', ['active', 'probation'])
      .order('access_level', { ascending: false });
    setTeamMembers(data ?? []);
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSyncSheets = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync-sheets');
      const data = await res.json();
      if (data.ok) setSyncResult(`Synced ${data.tabs} tabs at ${new Date(data.syncedAt).toLocaleTimeString('en-GB')}`);
      else setSyncResult(`Error: ${data.error}`);
    } catch { setSyncResult('Connection error — check env vars'); }
    finally { setSyncing(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      let parsed: unknown = s.value;
      try { parsed = JSON.parse(s.value as string); } catch { parsed = s.value; }
      await supabase.from('company_settings').upsert({ key: s.key, value: parsed });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as BeforeInstallPromptEvent).prompt();
    const result = await (deferredPrompt as BeforeInstallPromptEvent).userChoice;
    if (result.outcome === 'accepted') setPwaInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <Settings className="w-8 h-8 text-brand-sky" />
          System <span className="text-brand-sky">Settings</span>
        </h1>
        <p className="text-brand-steel font-bold text-xs uppercase tracking-widest mt-1">Admin · Maji Safi OS Configuration</p>
      </div>

      {/* Company Info Card */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Company Identity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Legal Name', value: 'Safiflow Ventures Group Limited' },
            { label: 'Trading As', value: 'Maji Safi' },
            { label: 'Registration', value: 'G241004-1234 (October 2024)' },
            { label: 'Location', value: 'Lukuli Road, Buziga, Kampala, Uganda' },
            { label: 'Product', value: '20L Refill · 20L Single-Use · 20L Reusable Jar · 5L Single-Use' },
            { label: 'Commercial Launch', value: 'May 3, 2026' },
            { label: 'Tagline', value: 'Hydrate. Elevate.' },
            { label: 'Break-even', value: '~220–240 jars/day at launch pricing' },
          ].map((item) => (
            <div key={item.label} className="bg-brand-navy/20 rounded-xl px-4 py-3 border border-white/5">
              <p className="text-[10px] text-brand-steel font-bold uppercase tracking-widest mb-1">{item.label}</p>
              <p className="text-sm text-white font-bold">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="bg-brand-navy/20 rounded-xl px-4 py-4 border border-white/5">
            <p className="text-[10px] text-brand-steel font-bold uppercase tracking-widest mb-2">Mission</p>
            <p className="text-sm text-white/80">Provide affordable, UNBS-certified purified water to Kampala households through a lean, technology-driven operations platform.</p>
          </div>
          <div className="bg-brand-navy/20 rounded-xl px-4 py-4 border border-white/5">
            <p className="text-[10px] text-brand-steel font-bold uppercase tracking-widest mb-2">Values</p>
            <div className="space-y-1">
              {['Quality First — 100% UNBS compliance', 'Data-Driven — every decision sourced', 'Lean Operations — no waste, tight loops', 'Community — affordable water for all'].map((v) => (
                <p key={v} className="text-xs text-white/70">• {v}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Org Chart */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <GitBranch className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Org Chart</h2>
        </div>
        {teamMembers.length === 0 ? (
          <p className="text-brand-steel text-sm font-bold">No team members found — add via Team Management.</p>
        ) : (
          <div className="space-y-4">
            {['founder', 'manager', 'supervisor', 'operator', 'viewer'].map((level) => {
              const group = teamMembers.filter((m) => m.access_level === level);
              if (group.length === 0) return null;
              return (
                <div key={level}>
                  <p className="text-[10px] text-brand-steel font-bold uppercase tracking-widest mb-2">{level}</p>
                  <div className="flex flex-wrap gap-3">
                    {group.map((m) => (
                      <div key={m.id} className="bg-brand-navy/30 border border-white/10 rounded-xl px-4 py-3 min-w-[160px]">
                        <p className="text-sm font-black text-white">{m.name}</p>
                        <p className="text-[10px] text-brand-steel mt-0.5">{m.role}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(m.departments ?? [m.department_slug]).map((d: string) => (
                            <span key={d} className="text-[8px] bg-brand-sky/10 text-brand-sky px-1.5 py-0.5 rounded font-mono">{d}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Company Settings */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Company Config</h2>
        </div>

        {loading ? (
          <p className="text-brand-steel text-xs font-black uppercase tracking-widest animate-pulse">Loading…</p>
        ) : (
          <div className="space-y-4">
            {settings.map((s) => (
              <div key={s.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                <div>
                  <p className="text-sm font-black text-white">{s.label || s.key}</p>
                  <p className="text-[10px] text-brand-steel mt-0.5">{s.description}</p>
                </div>
                <div className="md:col-span-2">
                  <input
                    value={String(s.value)}
                    onChange={(e) => handleChange(s.key, e.target.value)}
                    className="w-full bg-brand-navy/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40 font-mono"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                  saved
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'bg-brand-sky/20 border border-brand-sky/30 text-brand-pale hover:bg-brand-sky/30'
                }`}
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PIN Management */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">PIN Access Control</h2>
        </div>
        <p className="text-brand-steel text-xs font-bold">
          Set 4-digit PINs per role. Each role gets a QR code link for easy access on mobile. PINs are stored as bcrypt hashes server-side.
        </p>

        <div className="space-y-3">
          {pins.map((entry, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-3 items-center">
              <input
                value={entry.role}
                onChange={(e) => setPins((p) => p.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))}
                placeholder="Role (e.g. Ops Lead)"
                className="bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
              />
              <input
                value={entry.pin}
                onChange={(e) => setPins((p) => p.map((x, i) => i === idx ? { ...x, pin: e.target.value } : x))}
                placeholder="4-digit PIN"
                maxLength={4}
                type="password"
                className="bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
              />
              <div className="flex gap-2">
                <input
                  value={entry.dept}
                  onChange={(e) => setPins((p) => p.map((x, i) => i === idx ? { ...x, dept: e.target.value } : x))}
                  placeholder="dept slug"
                  className="flex-1 bg-brand-navy/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/40"
                />
                {entry.role && (
                  <button
                    onClick={() => setShowQR(showQR === entry.role ? null : entry.role)}
                    className="p-2 rounded-xl bg-brand-navy/30 border border-white/10 text-brand-sky hover:text-brand-pale transition-colors"
                    title="Show QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showQR === entry.role && entry.role && (
                <div className="col-span-3 flex flex-col items-center gap-3 py-4 bg-white/5 rounded-2xl border border-white/10">
                  <QRCode
                    value={`${APP_URL}/?role=${encodeURIComponent(entry.role)}&dept=${encodeURIComponent(entry.dept)}`}
                    size={180}
                    bgColor="transparent"
                    fgColor="#C1E8FF"
                    level="M"
                  />
                  <p className="text-[10px] text-brand-steel font-black uppercase tracking-widest">
                    Scan to open dashboard as {entry.role}
                  </p>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => setPins((p) => [...p, { role: '', pin: '', dept: '' }])}
            className="text-[11px] font-black text-brand-sky uppercase tracking-widest hover:text-brand-pale transition-colors"
          >
            + Add Another Role
          </button>
        </div>
      </section>

      {/* PWA Install */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Install App</h2>
        </div>

        {pwaInstalled ? (
          <div className="flex items-center gap-3 text-emerald-400">
            <span className="text-2xl">✅</span>
            <p className="font-black text-sm uppercase tracking-widest">Maji Safi OS is installed on this device.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-brand-steel text-sm font-bold">
              Install Maji Safi OS as a Progressive Web App for offline access, faster loads, and a native app feel.
            </p>
            {deferredPrompt ? (
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-sky/20 border border-brand-sky/30 text-brand-pale font-black text-sm uppercase tracking-widest hover:bg-brand-sky/30 transition-all"
              >
                📲 Install Now
              </button>
            ) : (
              <div className="space-y-2 text-sm text-brand-steel">
                <p className="font-bold">Manual install instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong className="text-white">iPhone/iPad:</strong> Tap Share → &quot;Add to Home Screen&quot;</li>
                  <li><strong className="text-white">Android Chrome:</strong> Tap ⋮ menu → &quot;Add to Home Screen&quot;</li>
                  <li><strong className="text-white">Desktop Chrome/Edge:</strong> Click the install icon in the address bar</li>
                </ul>
                <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 inline-block">
                  <QRCode
                    value={APP_URL}
                    size={150}
                    bgColor="transparent"
                    fgColor="#C1E8FF"
                    level="M"
                  />
                  <p className="text-[10px] text-brand-steel text-center mt-2 font-black uppercase tracking-widest">Scan to open on mobile</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Google Sheets Sync */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Google Sheets Sync</h2>
        </div>
        <p className="text-brand-steel text-sm font-bold">
          Syncs 8 tabs (Production, Quality, Sales, Inventory, Cash, Team, Compliance, Distributors) to Google Sheets. Runs automatically daily at 6 AM Kampala time (3 AM UTC).
        </p>
        <div className="p-4 bg-brand-navy/20 rounded-xl border border-white/5 font-mono text-xs text-brand-steel space-y-1">
          <p>GOOGLE_SERVICE_ACCOUNT_JSON={"{"}&quot;type&quot;:&quot;service_account&quot;,...{"}"}</p>
          <p>GOOGLE_SHEETS_ID=your_spreadsheet_id</p>
          <p>SUPABASE_SERVICE_ROLE_KEY=your_service_role_key</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleSyncSheets}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-sky/20 border border-brand-sky/30 text-brand-pale font-black text-sm uppercase tracking-widest hover:bg-brand-sky/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync to Google Sheets'}
          </button>
          {syncResult && (
            <span className={`text-xs font-bold ${syncResult.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {syncResult}
            </span>
          )}
        </div>
      </section>

      {/* Notification bridge */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-brand-sky" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Telegram Bridge</h2>
        </div>
        <p className="text-brand-steel text-sm font-bold">
          Set <code className="text-brand-sky">TELEGRAM_BOT_TOKEN</code> and <code className="text-brand-sky">TELEGRAM_CHAT_ID</code> environment variables to enable cross-platform notifications. When a department is @mentioned in Pulse, a Telegram message is sent automatically.
        </p>
        <div className="p-4 bg-brand-navy/20 rounded-xl border border-white/5 font-mono text-xs text-brand-steel space-y-1">
          <p>TELEGRAM_BOT_TOKEN=your_bot_token</p>
          <p>TELEGRAM_CHAT_ID=your_group_chat_id</p>
          <p>NEXT_PUBLIC_APP_URL=https://your-domain.com</p>
        </div>
      </section>
    </div>
  );
}

// Browser type augmentation for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
