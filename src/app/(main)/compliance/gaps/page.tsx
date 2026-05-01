'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import { AlertTriangle, CheckCircle2, Clock, Upload } from 'lucide-react';

interface ComplianceGap {
  id: string;
  source: string;
  gap_description: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'open' | 'in_progress' | 'resolved';
  due_date: string | null;
  notes: string | null;
  evidence_url: string | null;
  resolved_at: string | null;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#EF4444', bg: '#EF444415', label: 'Critical' },
  major: { color: '#F59E0B', bg: '#F59E0B15', label: 'Major' },
  minor: { color: '#10B981', bg: '#10B98115', label: 'Minor' },
};

const STATUS_ICONS: Record<string, React.ComponentType<any>> = {
  open: AlertTriangle,
  in_progress: Clock,
  resolved: CheckCircle2,
};

export default function ComplianceGapsPage() {
  const { user } = useAuth();
  const [gaps, setGaps] = useState<ComplianceGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadGaps();
  }, []);

  const loadGaps = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_gaps')
        .select('*')
        .eq('location_id', 'buziga')
        .order('severity', { ascending: false })
        .order('due_date', { ascending: true });
      if (error) throw error;
      setGaps(data ?? []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Error loading gaps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (gapId: string, currentNotes: string) => {
    setResolvingId(gapId);
    try {
      const { error } = await supabase
        .from('compliance_gaps')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', gapId);
      if (error) throw error;
      showToast({ type: 'success', message: '✓ Gap marked as resolved' });
      await loadGaps();
    } catch (err) {
      showToast({ type: 'error', message: 'Error resolving gap' });
    } finally {
      setResolvingId(null);
    }
  };

  const handleUpdateNotes = async (gapId: string, newNotes: string) => {
    try {
      const { error } = await supabase
        .from('compliance_gaps')
        .update({ notes: newNotes })
        .eq('id', gapId);
      if (error) throw error;
      showToast({ type: 'success', message: '✓ Notes updated' });
      setEditingId(null);
      await loadGaps();
    } catch (err) {
      showToast({ type: 'error', message: 'Error updating notes' });
    }
  };

  const openGaps = gaps.filter(g => g.status !== 'resolved');
  const resolvedGaps = gaps.filter(g => g.status === 'resolved');
  const criticalCount = openGaps.filter(g => g.severity === 'critical').length;

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface mb-2">
          Compliance Gaps
        </h1>
        <p className="text-sm text-outline/70 font-label">
          Track UNBS audit readiness and remediation progress
        </p>
      </header>

      {/* Alert if critical gaps exist */}
      {criticalCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <p className="text-lg font-bold text-red-900">
                {criticalCount} Critical Gap{criticalCount !== 1 ? 's' : ''} Open
              </p>
              <p className="text-sm text-red-700 mt-1">
                Must be resolved before UNBS inspection on May 14
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Gaps', value: gaps.length, color: '#0077B6' },
          { label: 'Open', value: openGaps.length, color: '#F59E0B' },
          { label: 'Resolved', value: resolvedGaps.length, color: '#10B981' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/20">
            <p className="text-[10px] text-outline uppercase font-label tracking-widest mb-2">{stat.label}</p>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Open Gaps */}
      {openGaps.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Open Gaps</h2>
          <div className="space-y-3">
            {openGaps.map(gap => {
              const SevIcon = STATUS_ICONS[gap.status];
              const sevCfg = SEVERITY_CONFIG[gap.severity];
              return (
                <div key={gap.id} className="bg-white border border-outline-variant/20 rounded-lg p-5 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: sevCfg.bg }}>
                      <AlertTriangle className="w-5 h-5" style={{ color: sevCfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="text-sm font-bold text-on-surface">{gap.gap_description}</p>
                          <p className="text-xs text-outline/60 font-label mt-1">
                            Source: {gap.source}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                            {sevCfg.label}
                          </span>
                          {gap.due_date && (
                            <span className="text-xs text-outline/70 font-label">
                              Due: {new Date(gap.due_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notes section */}
                      <div className="mt-3 pt-3 border-t border-outline-variant/10">
                        {editingId === gap.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="flex-1 text-xs border border-outline-variant/30 rounded px-2 py-1 font-label focus:outline-none focus:border-primary/50"
                              placeholder="Add remediation notes…"
                            />
                            <button
                              onClick={() => handleUpdateNotes(gap.id, editNotes)}
                              className="px-3 py-1 bg-primary text-white text-xs font-bold rounded hover:brightness-110 transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-outline/20 text-outline text-xs font-bold rounded hover:bg-outline/30 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-outline/70 font-label">
                              {gap.notes || <span className="italic text-outline/40">No notes yet</span>}
                            </p>
                            <button
                              onClick={() => {
                                setEditingId(gap.id);
                                setEditNotes(gap.notes || '');
                              }}
                              className="text-xs text-primary font-bold mt-2 hover:underline"
                            >
                              {gap.notes ? 'Edit' : 'Add'} Notes
                            </button>
                          </>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleResolve(gap.id, gap.notes || '')}
                          disabled={resolvingId === gap.id}
                          className="px-4 py-2 bg-green-500/15 text-green-700 text-xs font-bold rounded hover:bg-green-500/25 transition-all disabled:opacity-50"
                        >
                          {resolvingId === gap.id ? 'Marking…' : '✓ Mark Resolved'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Resolved Gaps */}
      {resolvedGaps.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Resolved</h2>
          <div className="space-y-2">
            {resolvedGaps.map(gap => (
              <div key={gap.id} className="bg-green-50 border border-green-200 rounded-lg p-4 opacity-75">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-900 line-through">{gap.gap_description}</p>
                    <p className="text-xs text-green-700 font-label">
                      Resolved {gap.resolved_at ? new Date(gap.resolved_at).toLocaleDateString('en-GB') : 'recently'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading && <p className="text-center text-outline/50 text-sm">Loading compliance gaps…</p>}
      {!loading && gaps.length === 0 && (
        <p className="text-center text-outline/50 text-sm">No compliance gaps recorded yet.</p>
      )}
    </div>
  );
}
