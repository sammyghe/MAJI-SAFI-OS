'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import { Download, ArrowLeft, CheckCircle2, AlertTriangle, Calendar, User } from 'lucide-react';
import Link from 'next/link';

interface AuditEvent {
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  status?: 'pending' | 'completed' | 'failed';
}

export default function BatchAuditPage() {
  const params = useParams();
  const batchId = params.batch_id as string;
  const [batch, setBatch] = useState<any>(null);
  const [production, setProduction] = useState<any>(null);
  const [qcTests, setQcTests] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatchData();
  }, [batchId]);

  const loadBatchData = async () => {
    try {
      const [prodRes, qcRes] = await Promise.all([
        supabase.from('production_logs').select('*').eq('id', batchId).single(),
        supabase.from('water_tests').select('*').eq('batch_id', batchId),
      ]);

      if (prodRes.error) throw prodRes.error;

      const prodData = prodRes.data;
      setProduction(prodData);
      setQcTests(qcRes.data ?? []);

      // Build audit trail
      const trail: AuditEvent[] = [];

      if (prodData) {
        trail.push({
          timestamp: prodData.created_at,
          actor: prodData.created_by || 'Unknown',
          action: 'Batch Created',
          details: `${prodData.jar_count} jars logged`,
          status: 'completed',
        });

        if (prodData.updated_at && prodData.updated_at !== prodData.created_at) {
          trail.push({
            timestamp: prodData.updated_at,
            actor: 'System',
            action: 'Batch Updated',
            details: 'Production data modified',
            status: 'completed',
          });
        }
      }

      (qcRes.data ?? []).forEach((test: any) => {
        trail.push({
          timestamp: test.tested_at,
          actor: test.tested_by || 'QC Team',
          action: `QC Test: ${test.test_type || 'Water Analysis'}`,
          details: `Result: ${test.result} | Parameter: ${test.parameter || '—'}`,
          status: test.result === 'PASS' ? 'completed' : test.result === 'FAIL' ? 'failed' : 'pending',
        });
      });

      // Sort by timestamp
      trail.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setAuditTrail(trail);
    } catch (err) {
      showToast({ type: 'error', message: 'Error loading batch data' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="px-8 py-10 text-center">Loading batch audit trail...</div>;
  }

  if (!production) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="text-outline/50">Batch not found</p>
        <Link href="/production" className="text-primary mt-4 inline-block">← Back to Production</Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'text-amber-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
  };

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/production" className="flex items-center gap-2 text-primary mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Production
        </Link>
        <h1 className="text-4xl font-extrabold font-headline text-on-surface mb-2">
          Batch Audit Trail
        </h1>
        <p className="text-sm text-outline/70 font-label">
          Complete history and QC record for batch {batchId?.slice(0, 8)}
        </p>
      </div>

      {/* Batch Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Batch ID', value: batchId?.slice(0, 8) },
          { label: 'Jars', value: production.jar_count?.toLocaleString() },
          { label: 'Date', value: new Date(production.production_date).toLocaleDateString('en-GB') },
          { label: 'Status', value: 'Completed' },
        ].map(item => (
          <div key={item.label} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
            <p className="text-[10px] text-outline uppercase font-label tracking-widest mb-2">{item.label}</p>
            <p className="text-lg font-bold text-on-surface">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Audit Trail Timeline */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 overflow-hidden">
        <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Complete Audit Trail</h2>
        </div>

        <div className="p-6 space-y-6">
          {auditTrail.length > 0 ? (
            auditTrail.map((event, idx) => {
              const Icon = event.status === 'failed' ? AlertTriangle : CheckCircle2;
              return (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      event.status === 'failed' ? 'bg-red-50 border-red-300' :
                      event.status === 'completed' ? 'bg-green-50 border-green-300' :
                      'bg-amber-50 border-amber-300'
                    }`}>
                      <Icon className={`w-5 h-5 ${statusColors[event.status || 'pending']}`} />
                    </div>
                    {idx < auditTrail.length - 1 && (
                      <div className="w-1 h-8 bg-outline-variant/20 my-2" />
                    )}
                  </div>
                  <div className="flex-1 py-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-on-surface">{event.action}</p>
                      <span className="text-[10px] text-outline/60 font-label">
                        {new Date(event.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-outline/70 mb-1">{event.details}</p>
                    <div className="flex items-center gap-4 text-[10px] text-outline/50">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {event.actor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(event.timestamp).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-outline/50">No audit events recorded.</p>
          )}
        </div>
      </div>

      {/* QC Test Details */}
      {qcTests.length > 0 && (
        <div className="mt-8 bg-surface-container-low rounded-xl border border-outline-variant/20 overflow-hidden">
          <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10">
            <h2 className="text-lg font-bold text-on-surface">Quality Control Tests ({qcTests.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest">
                  {['Date', 'Type', 'Parameter', 'Value', 'Result', 'Tested By'].map(h => (
                    <th key={h} className="px-6 py-3 text-[10px] font-label text-outline uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {qcTests.map((test, idx) => (
                  <tr key={idx} className="hover:bg-surface-container/50">
                    <td className="px-6 py-4 text-sm">{new Date(test.tested_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{test.test_type || '—'}</td>
                    <td className="px-6 py-4 text-sm">{test.parameter || '—'}</td>
                    <td className="px-6 py-4 text-sm">{test.value || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${test.result === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                        {test.result || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{test.tested_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Button */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-all"
        >
          <Download className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
