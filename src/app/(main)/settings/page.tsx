"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Settings, Save, RefreshCw, Shield, Bell, Zap, Users,
  QrCode, Building2, GitBranch, Sun, Moon, User, Link as LinkIcon,
  Activity, Database, ExternalLink,
} from 'lucide-react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { useTheme } from 'next-themes';
import { useSound } from '@/hooks/useSound';
import Link from 'next/link';

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

type Tab = 'profile' | 'team' | 'company' | 'integrations' | 'admin';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile',      label: 'Profile',           icon: User },
  { id: 'team',         label: 'Team & Access',      icon: Users },
  { id: 'company',      label: 'Company Setup',      icon: Building2 },
  { id: 'integrations', label: 'Integrations',       icon: LinkIcon },
  { id: 'admin',        label: 'Technical Admin',    icon: Database },
];

const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function SettingsPage() {
  const { user } = useAuth();
  const { soundEnabled, toggleSound } = useSound();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [settings, setSettings] = useState<CompanySetting[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [pins, setPins] = useState<PinEntry[]>([{ role: '', pin: '', dept: '' }]);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  const isFounder = user?.role === 'founder';

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setPwaInstalled(true));
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
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Settings className="w-7 h-7 text-[#0077B6]" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Maji Safi OS · Buziga</p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {TABS.map(({ id, label, icon: Icon }) => {
          if (id === 'admin' && !isFounder) return null;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === id
                  ? 'border-[#0077B6] text-[#0077B6]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ─── PROFILE ─────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Identity */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-[#0077B6]" /> Your Profile
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0077B6] to-[#7EC8E3] flex items-center justify-center text-white text-lg font-black">
                {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'SG'}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{user?.name ?? '—'}</p>
                <p className="text-sm text-slate-500 capitalize">{user?.role ?? '—'}</p>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0077B6]" /> Preferences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">System Sounds</p>
                  <p className="text-xs text-slate-400">Chimes on success and alerts</p>
                </div>
                <button
                  onClick={toggleSound}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    soundEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Appearance</p>
                  <p className="text-xs text-slate-400">Light or dark mode</p>
                </div>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </section>

          {/* PWA Install */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0077B6]" /> Install App
            </h2>
            {pwaInstalled ? (
              <p className="text-emerald-600 font-semibold text-sm">✓ Maji Safi OS is installed on this device.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Install as a Progressive Web App for faster loads and offline access.</p>
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallPWA}
                    className="px-5 py-2.5 rounded-xl bg-[#0077B6] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    📲 Install Now
                  </button>
                ) : (
                  <div className="text-sm text-slate-500 space-y-1">
                    <p><strong>iPhone:</strong> Tap Share → "Add to Home Screen"</p>
                    <p><strong>Android:</strong> Tap ⋮ → "Add to Home Screen"</p>
                    <div className="mt-3 inline-block p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <QRCode value={APP_URL} size={130} bgColor="#ffffff" fgColor="#0077B6" level="M" />
                      <p className="text-[10px] text-slate-400 text-center mt-2 font-semibold uppercase tracking-widest">Scan to open</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── TEAM & ACCESS ───────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Team management link */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0077B6]" /> Team Management
              </h2>
              <Link href="/settings/team-roles" className="flex items-center gap-1.5 text-xs font-bold text-[#0077B6] hover:underline">
                Manage Roles <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-sm text-slate-500 mb-4">Team members, access levels, and role assignments are managed in Team & Roles.</p>
            <Link
              href="/settings/team-roles"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0077B6] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Users className="w-4 h-4" /> Open Team & Roles
            </Link>
          </section>

          {/* Org Chart */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-[#0077B6]" /> Org Chart
            </h2>
            {teamMembers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">No team members yet.</p>
                <Link href="/settings/team-roles" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#0077B6] text-white text-xs font-bold hover:opacity-90 transition-opacity">
                  Add First Team Member
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {['founder', 'manager', 'supervisor', 'operator', 'viewer'].map((level) => {
                  const group = teamMembers.filter((m) => m.access_level === level);
                  if (group.length === 0) return null;
                  return (
                    <div key={level}>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{level}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.map((m) => (
                          <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[140px]">
                            <p className="text-sm font-bold text-slate-800">{m.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{m.role}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(m.departments ?? [m.department_slug]).map((d: string) => (
                                <span key={d} className="text-[8px] bg-[#0077B6]/10 text-[#0077B6] px-1.5 py-0.5 rounded font-mono">{d}</span>
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

          {/* PIN Access Control */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0077B6]" /> PIN Access Control
            </h2>
            <p className="text-slate-500 text-xs">Set 4-digit PINs per role. Each role gets a QR code for easy mobile access. PINs stored as bcrypt hashes.</p>
            <div className="space-y-3">
              {pins.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                  <input
                    value={entry.role}
                    onChange={(e) => setPins((p) => p.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))}
                    placeholder="Role name"
                    className="bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0077B6] focus:outline-none"
                  />
                  <input
                    value={entry.pin}
                    onChange={(e) => setPins((p) => p.map((x, i) => i === idx ? { ...x, pin: e.target.value } : x))}
                    placeholder="4-digit PIN"
                    maxLength={4}
                    type="password"
                    className="bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0077B6] focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      value={entry.dept}
                      onChange={(e) => setPins((p) => p.map((x, i) => i === idx ? { ...x, dept: e.target.value } : x))}
                      placeholder="dept"
                      className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0077B6] focus:outline-none"
                    />
                    {entry.role && (
                      <button
                        onClick={() => setShowQR(showQR === entry.role ? null : entry.role)}
                        className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[#0077B6] hover:bg-slate-200 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showQR === entry.role && entry.role && (
                    <div className="col-span-3 flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-xl border border-slate-200">
                      <QRCode
                        value={`${APP_URL}/?role=${encodeURIComponent(entry.role)}&dept=${encodeURIComponent(entry.dept)}`}
                        size={160}
                        bgColor="#f8fafc"
                        fgColor="#0077B6"
                        level="M"
                      />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Scan — {entry.role}</p>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPins((p) => [...p, { role: '', pin: '', dept: '' }])}
                className="text-xs font-bold text-[#0077B6] hover:underline"
              >
                + Add Role
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ─── COMPANY SETUP ───────────────────────────────────── */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {/* Identity */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0077B6]" /> Company Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Legal Name', value: 'Safiflow Ventures Group Limited' },
                { label: 'Trading As', value: 'Maji Safi' },
                { label: 'Registration', value: 'G241004-1234 (October 2024)' },
                { label: 'Location', value: 'Lukuli Road, Buziga, Kampala, Uganda' },
                { label: 'Products', value: '20L Refill · 20L Single-Use · 20L Reusable Jar · 5L Single-Use' },
                { label: 'Commercial Launch', value: 'Post-May 20, 2026' },
                { label: 'Tagline', value: 'Hydrate. Elevate.' },
                { label: 'Break-even', value: '~220–240 jars/day at launch pricing' },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm text-slate-800 font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Mission</p>
                <p className="text-xs text-slate-600">Provide affordable, UNBS-certified purified water to Kampala households through a lean, technology-driven operations platform.</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Values</p>
                <div className="space-y-0.5">
                  {['Quality First — 100% UNBS compliance', 'Data-Driven — every decision sourced', 'Lean Operations — no waste', 'Community — affordable water for all'].map((v) => (
                    <p key={v} className="text-xs text-slate-500">• {v}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Company Config from DB */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#0077B6]" /> Configurable Settings
            </h2>
            {loading ? (
              <p className="text-slate-400 text-xs animate-pulse">Loading…</p>
            ) : settings.length === 0 ? (
              <p className="text-slate-400 text-sm">No configurable settings in database yet.</p>
            ) : (
              <div className="space-y-3">
                {settings.map((s) => (
                  <div key={s.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{s.label || s.key}</p>
                      <p className="text-[10px] text-slate-400">{s.description}</p>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        value={String(s.value)}
                        onChange={(e) => handleChange(s.key, e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                      saved
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                        : 'bg-[#0077B6] text-white hover:bg-[#005f92]'
                    }`}
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saved ? '✓ Saved' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── INTEGRATIONS ────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Google Drive */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0077B6]" /> Google Drive (QMS Documents)
            </h2>
            <p className="text-sm text-slate-500">Richard's QMS folder is linked. All 14 forms are accessible from every department page and the /qms page.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/qms" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0077B6]/10 text-[#0077B6] text-sm font-bold hover:bg-[#0077B6]/20 transition-colors">
                View QMS Forms <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <span className="text-xs text-slate-400">Folder: 15X6NHxGDPSd404oaUSGsfbPKWqcVMXNI</span>
            </div>
          </section>

          {/* Google Sheets Sync */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0077B6]" /> Google Sheets Sync
            </h2>
            <p className="text-sm text-slate-500">
              Syncs 8 tabs (Production, Quality, Sales, Inventory, Cash, Team, Compliance, Distributors). Runs daily at 6 AM Kampala time.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-500 space-y-1">
              <p>GOOGLE_SERVICE_ACCOUNT_JSON={'{"'}type":"service_account",...{'}'}</p>
              <p>GOOGLE_SHEETS_ID=your_spreadsheet_id</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleSyncSheets}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0077B6] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync to Sheets'}
              </button>
              {syncResult && (
                <span className={`text-xs font-bold ${syncResult.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                  {syncResult}
                </span>
              )}
            </div>
          </section>

          {/* Telegram Bridge */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0077B6]" /> Telegram Bridge
            </h2>
            <p className="text-sm text-slate-500">
              When a department is @mentioned in Pulse, a Telegram message is sent. Morning brief fires at 6 AM Kampala time.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-500 space-y-1">
              <p>TELEGRAM_BOT_TOKEN=your_bot_token</p>
              <p>TELEGRAM_CHAT_ID=your_group_chat_id</p>
              <p>NEXT_PUBLIC_APP_URL=https://your-domain.com</p>
            </div>
          </section>

          {/* WhatsApp / SMS (Planned) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-300" /> WhatsApp / SMS{' '}
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Planned</span>
            </h2>
            <p className="text-sm text-slate-400">WhatsApp Business API for order confirmation receipts. SMS via Africa's Talking for distributors without smartphones. Coming after launch.</p>
          </section>
        </div>
      )}

      {/* ─── TECHNICAL ADMIN (founder only) ──────────────────── */}
      {activeTab === 'admin' && isFounder && (
        <div className="space-y-6">
          {/* Quick Links */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#0077B6]" /> Admin Pages
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { href: '/settings/ai-health',   label: 'AI Health',       icon: Activity },
                { href: '/settings/security',     label: 'Security',        icon: Shield },
                { href: '/settings/simulation',   label: 'Simulation Mode', icon: Zap },
                { href: '/settings/souls',        label: 'AI Souls',        icon: User },
                { href: '/settings/team-roles',   label: 'Team & Roles',    icon: Users },
                { href: '/admin/features',        label: 'Feature Toggles', icon: Settings },
                { href: '/finance/audit',         label: 'Audit Log',       icon: Database },
                { href: '/system-health',         label: 'System Health',   icon: Activity },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-[#0077B6]/30 transition-all"
                >
                  <Icon className="w-4 h-4 text-[#0077B6]" />
                  {label}
                </Link>
              ))}
            </div>
          </section>

          {/* Schema Reload */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0077B6]" /> Database Schema
            </h2>
            <p className="text-sm text-slate-500">Force PostgREST to reload the schema if you see "column not found in schema cache" errors after a migration.</p>
            <SchemaReloadButton />
          </section>

          {/* Env Vars Reminder */}
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" /> Required GitHub Secrets
            </h2>
            <p className="text-xs text-amber-600">These must be set in GitHub Actions secrets (repo → Settings → Secrets):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'].map((s) => (
                <span key={s} className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">{s}</span>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SchemaReloadButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const reload = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/reload-schema', { method: 'POST' });
      const data = await res.json();
      if (data.ok) { setStatus('ok'); setMsg(`Reloaded at ${new Date(data.reloaded_at).toLocaleTimeString('en-GB')}`); }
      else { setStatus('error'); setMsg(data.error ?? 'Unknown error'); }
    } catch { setStatus('error'); setMsg('Network error'); }
    setTimeout(() => setStatus('idle'), 5000);
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={reload}
        disabled={status === 'loading'}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0077B6] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
        {status === 'loading' ? 'Reloading…' : 'Reload Schema'}
      </button>
      {msg && <span className={`text-xs font-bold ${status === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</span>}
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
