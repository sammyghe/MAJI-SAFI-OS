'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import { useCanEdit } from '@/hooks/useCanEdit';

interface Prospect {
  id: string;
  name: string;
  phone?: string;
  zone?: string;
  product_interest?: string;
  status: string;
  last_contact?: string;
  created_at: string;
}

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'dead'];

export default function MarketingPage() {
  const { canEdit, isReadOnly } = useCanEdit('marketing');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', product_interest: '20L Refill (Bulk)' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editProspect, setEditProspect] = useState<Prospect | null>(null);
  const [editForm, setEditForm] = useState({ status: 'new', phone: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadProspects(); }, []);

  const loadProspects = async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('location_id', 'buziga')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setProspects(data ?? []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Error loading prospects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!leadForm.name) throw new Error('Name is required');
      const { error: insertError } = await supabase
        .from('prospects')
        .insert([{
          name: leadForm.name,
          phone: leadForm.phone,
          product_interest: leadForm.product_interest,
          status: 'new',
          location_id: 'buziga',
        }]);
      if (insertError) throw insertError;
      setLeadForm({ name: '', phone: '', product_interest: '20L Refill (Bulk)' });
      showToast({ type: 'success', message: `Lead "${leadForm.name}" recorded.` });
      await loadProspects();
    } catch (err: any) {
      setError(err.message ?? 'Error saving lead');
      showToast({ type: 'error', message: err.message ?? 'Error saving lead' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: Prospect) => {
    setEditProspect(p);
    setEditForm({ status: p.status, phone: p.phone ?? '', notes: '' });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProspect) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('prospects')
        .update({
          status: editForm.status,
          phone: editForm.phone,
          last_contact: new Date().toISOString().split('T')[0],
        })
        .eq('id', editProspect.id);
      if (error) throw error;
      setEditProspect(null);
      showToast({ type: 'success', message: 'Prospect updated.' });
      await loadProspects();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message ?? 'Error updating prospect' });
    } finally {
      setEditSaving(false);
    }
  };

  const newCount = prospects.filter((p) => p.status === 'new').length;
  const qualifiedCount = prospects.filter((p) => p.status === 'qualified').length;
  const convertedCount = prospects.filter((p) => p.status === 'converted').length;
  const sleepingCount = prospects.filter((p) => {
    if (!p.last_contact) return false;
    const daysSince = (Date.now() - new Date(p.last_contact).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  }).length;

  const statusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'bg-secondary-container text-secondary';
      case 'qualified': return 'bg-primary-container text-on-primary-container';
      case 'contacted': return 'bg-surface-container-highest text-primary';
      case 'dead': return 'bg-tertiary-container/30 text-outline';
      default: return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {isReadOnly && (
        <div className="mb-6 px-4 py-2.5 bg-surface-container border-l-2 border-outline/30">
          <span className="text-[10px] font-label text-outline uppercase tracking-widest">View only — you are not assigned to this department</span>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 text-outline mb-2">
            <span className="text-[10px] tracking-widest uppercase font-label">Commercial Ledger</span>
            <span className="w-8 h-[1px] bg-outline-variant/30" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
            Marketing – Distribution Pipeline
          </h1>
        </div>
        <div className="bg-surface-container-low p-6 border-l-4 border-primary-container min-w-[240px]">
          <p className="text-xs text-outline font-label mb-1">Total Prospects</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-body font-semibold text-primary">{prospects.length}</span>
            <span className="text-xs font-body text-outline/50">leads [source: prospects, buziga]</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'New Prospects', value: newCount, color: 'text-on-surface', ref: 'prospects' },
          { label: 'Qualified', value: qualifiedCount, color: 'text-secondary', ref: 'prospects' },
          { label: 'Converted', value: convertedCount, color: 'text-secondary-fixed', ref: 'prospects' },
          { label: 'Sleeping >7d', value: sleepingCount, color: sleepingCount > 0 ? 'text-tertiary' : 'text-outline', ref: 'prospects' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-low ghost-border p-5">
            <p className="text-[10px] text-outline font-label uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-2xl font-body font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-outline/40 font-label mt-1">[source: {stat.ref}]</p>
          </div>
        ))}
      </div>

      {/* Prospect Table */}
      <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden mb-8">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container">
          <h3 className="font-headline font-bold text-lg">Active Distribution Pipeline</h3>
          <span className="text-[10px] font-body text-outline/50 uppercase tracking-widest">[source: prospects, buziga]</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest">
                {['Name', 'Phone', 'Product Interest', 'Status', 'Added', ''].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-label text-outline uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-outline/50 font-label text-sm">Loading...</td>
                </tr>
              ) : prospects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-outline/50 font-label text-sm">No prospects yet — add the first lead below</td>
                </tr>
              ) : prospects.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-high/50 transition-colors cursor-pointer" onClick={() => openEdit(p)}>
                  <td className="px-6 py-5 text-sm font-medium">{p.name}</td>
                  <td className="px-6 py-5 text-sm text-outline font-label">{p.phone ?? '—'}</td>
                  <td className="px-6 py-5 text-sm font-body">{p.product_interest ?? '—'}</td>
                  <td className="px-6 py-5">
                    <span className={`${statusColor(p.status)} text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter uppercase`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-body text-outline/70">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-label text-primary">Edit</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && <div className="grid grid-cols-12 gap-6">
        {/* Lead Intake Form */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container ghost-border p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-9xl">forum</span>
          </div>
          <h4 className="font-headline font-bold text-xl mb-6">Record New Lead</h4>
          <form onSubmit={handleAddLead} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Lead Name</label>
                <input
                  type="text"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  placeholder="e.g. John Bosco"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Phone Number</label>
                <input
                  type="text"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  placeholder="+256..."
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Product Interest</label>
              <select
                value={leadForm.product_interest}
                onChange={(e) => setLeadForm({ ...leadForm, product_interest: e.target.value })}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              >
                <option>20L Refill (Bulk)</option>
                <option>20L Single-Use</option>
                <option>20L Reusable Jar</option>
                <option>5L Single-Use</option>
                <option>New Distributorship</option>
              </select>
            </div>
            {error && (
              <div className="p-3 bg-tertiary-container/10 border-l-2 border-tertiary-container">
                <p className="text-tertiary text-xs font-label">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 bg-primary text-on-primary font-bold text-xs py-3 font-label transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Record Lead'}
            </button>
          </form>
        </div>

        {/* Pipeline stats */}
        <div className="col-span-12 lg:col-span-5 grid grid-rows-2 gap-6">
          <div className="bg-secondary-container/10 p-6 border border-secondary/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-secondary-fixed material-symbols-outlined">analytics</span>
              <span className="rounded-none bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-secondary uppercase font-label">Pipeline</span>
            </div>
            <p className="text-on-surface-variant text-sm font-label mb-1">Conversion Rate</p>
            <h5 className="text-3xl font-body font-bold text-secondary">
              {prospects.length > 0 ? Math.round((convertedCount / prospects.length) * 100) : 0}%
            </h5>
            <p className="text-[10px] text-outline/50 mt-2 font-label">[source: prospects, buziga]</p>
          </div>
          <div className="bg-surface-container-low p-6 ghost-border flex flex-col justify-center">
            <p className="text-xs text-outline font-label uppercase tracking-widest mb-2">Target</p>
            <p className="text-xl font-headline font-bold">3 T1 prospects / week</p>
            <p className="text-xs text-on-surface-variant font-label leading-relaxed mt-2">
              Click any row to update status, phone, or contact date.
            </p>
          </div>
        </div>
      </div>}

      {/* Edit Prospect Modal */}
      {canEdit && editProspect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold font-headline mb-1">{editProspect.name}</h2>
            <p className="text-[10px] text-outline/50 font-label mb-6">[source: prospects row {editProspect.id?.slice(0, 8)}]</p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <p className="text-[10px] text-outline/50 font-label">Saving will also update last_contact to today.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditProspect(null)}
                  className="flex-1 py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
