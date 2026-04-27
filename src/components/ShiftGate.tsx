'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import VoiceInputButton from '@/components/VoiceInputButton';
import PhotoCapture from '@/components/PhotoCapture';

interface Shift {
  id: string;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
}

interface Handover {
  id: string;
  status_summary: string | null;
  what_running: string | null;
  what_needs_attention: string | null;
  who_to_call: string | null;
  from_shift_id: string | null;
}

interface ShiftGateProps {
  onShiftActive?: (shiftId: string) => void;
}

export default function ShiftGate({ onShiftActive }: ShiftGateProps) {
  const { user } = useAuth();
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shift, setShift] = useState<Shift | null>(null);
  const [pendingHandover, setPendingHandover] = useState<Handover | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showEndForm, setShowEndForm] = useState(false);
  const [working, setWorking] = useState(false);

  // Handover form state
  const [handoverForm, setHandoverForm] = useState({
    status_summary: '',
    what_running: '',
    what_needs_attention: '',
    who_to_call: '',
  });
  const [handoverPhotos, setHandoverPhotos] = useState<string[]>([]);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];

    // Get today's shift for this user
    const { data: shiftData } = await supabase
      .from('shifts')
      .select('id, status, actual_start, actual_end')
      .eq('team_member_id', user.id)
      .eq('shift_date', today)
      .in('status', ['active', 'ended'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setShift(shiftData ?? null);
    setShiftLoading(false);
    if (shiftData?.status === 'active') onShiftActive?.(shiftData.id);

    // Check for unacknowledged handover (from previous shift, not created by this user)
    if (!shiftData || shiftData.status !== 'active') {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const { data: ho } = await supabase
        .from('shift_handovers')
        .select('id, status_summary, what_running, what_needs_attention, who_to_call, from_shift_id')
        .is('acknowledged_at', null)
        .gte('created_at', `${yesterday}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ho) {
        setPendingHandover(ho);
        setShowHandoverModal(true);
      }
    }
  };

  const acknowledgeHandover = async () => {
    if (!pendingHandover || !user?.id) return;
    setWorking(true);
    await supabase
      .from('shift_handovers')
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
      .eq('id', pendingHandover.id);
    setPendingHandover(null);
    setShowHandoverModal(false);
    setWorking(false);
  };

  const startShift = async () => {
    if (!user?.id) return;
    setWorking(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('shifts')
      .insert([{
        team_member_id: user.id,
        shift_date: today,
        actual_start: new Date().toISOString(),
        status: 'active',
        location_id: 'buziga',
      }])
      .select()
      .single();
    if (data) {
      setShift(data);
      onShiftActive?.(data.id);
    }
    setWorking(false);
  };

  const endShift = async () => {
    if (!user?.id || !shift || shift.status !== 'active') return;
    setWorking(true);
    // Update shift
    await supabase
      .from('shifts')
      .update({ status: 'ended', actual_end: new Date().toISOString() })
      .eq('id', shift.id);

    // Create handover
    await supabase.from('shift_handovers').insert([{
      from_shift_id: shift.id,
      status_summary: handoverForm.status_summary,
      what_running: handoverForm.what_running,
      what_needs_attention: handoverForm.what_needs_attention,
      who_to_call: handoverForm.who_to_call,
      photos: handoverPhotos,
      location_id: 'buziga',
    }]);

    setShift({ ...shift, status: 'ended', actual_end: new Date().toISOString() });
    setShowEndForm(false);
    setWorking(false);
  };

  if (shiftLoading) return null;

  const hoursOnShift = shift?.actual_start
    ? Math.floor((Date.now() - new Date(shift.actual_start).getTime()) / 3600000)
    : 0;

  return (
    <>
      {/* Handover acknowledgment modal */}
      {showHandoverModal && pendingHandover && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-amber-600 font-black text-sm uppercase tracking-widest">Shift Handover</p>
            </div>
            <p className="text-xs text-slate-500 mb-5 font-label">Read before starting your shift</p>

            {pendingHandover.status_summary && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-sm text-slate-900">{pendingHandover.status_summary}</p>
              </div>
            )}
            {pendingHandover.what_running && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">What's Running</p>
                <p className="text-sm text-slate-900">{pendingHandover.what_running}</p>
              </div>
            )}
            {pendingHandover.what_needs_attention && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Needs Attention</p>
                <p className="text-sm text-amber-600">{pendingHandover.what_needs_attention}</p>
              </div>
            )}
            {pendingHandover.who_to_call && (
              <div className="mb-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Call if Problem</p>
                <p className="text-sm text-slate-900">{pendingHandover.who_to_call}</p>
              </div>
            )}

            <button
              onClick={acknowledgeHandover}
              disabled={working}
              className="w-full py-4 bg-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-60"
            >
              <CheckCircle className="inline w-4 h-4 mr-2" />
              Acknowledged — Start My Shift
            </button>
          </div>
        </div>
      )}

      {/* End shift handover form */}
      {showEndForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
            <p className="text-slate-900 font-black text-sm uppercase tracking-widest mb-1">End of Shift Handover</p>
            <p className="text-slate-500 text-xs mb-5">Fill this in for the next shift</p>

            {((['status_summary','what_running','what_needs_attention','who_to_call']) as (keyof typeof handoverForm)[]).map((key) => {
              const labels: Record<string, string> = {
                status_summary: 'Current Status',
                what_running: "What's Running",
                what_needs_attention: 'Needs Attention',
                who_to_call: 'Who to Call',
              };
              return (
                <div key={key} className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    {labels[key]}
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={handoverForm[key]}
                      onChange={(e) => setHandoverForm({ ...handoverForm, [key]: e.target.value })}
                      className="flex-1 bg-slate-50 text-slate-900 text-sm rounded-xl border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:border-[#0077B6]"
                    />
                    <VoiceInputButton
                      currentValue={handoverForm[key]}
                      onTranscript={(t) => setHandoverForm({ ...handoverForm, [key]: t })}
                    />
                  </div>
                </div>
              );
            })}

            <div className="mb-5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Photos (optional)
              </label>
              <PhotoCapture userId={user?.id ?? 'anon'} onUploaded={setHandoverPhotos} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndForm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-sm rounded-2xl"
              >
                Cancel
              </button>
              <button
                onClick={endShift}
                disabled={working}
                className="flex-1 py-3 bg-[#8b5cf6] text-white font-black text-sm uppercase tracking-widest rounded-2xl active:scale-95 disabled:opacity-60"
              >
                End Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift status card */}
      {shift === null && !showHandoverModal && (
        <div className="mb-6">
          <button
            onClick={startShift}
            disabled={working}
            className="w-full py-5 bg-[#0077B6] text-white font-black text-base uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-60"
          >
            <Play size={20} fill="white" />
            Start Shift
          </button>
          <p className="text-center text-slate-500 text-xs mt-2">Clock in to begin your shift</p>
        </div>
      )}

      {shift?.status === 'active' && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shift Active</p>
            <p className="text-slate-900 font-black text-sm">{hoursOnShift}h {shift.actual_start ? Math.floor(((Date.now() - new Date(shift.actual_start).getTime()) % 3600000) / 60000) : 0}m</p>
          </div>
          <button
            onClick={() => setShowEndForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-zinc-200 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            <Square size={12} />
            End Shift
          </button>
        </div>
      )}

      {shift?.status === 'ended' && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shift Ended</p>
            <p className="text-emerald-600 font-black text-sm">Great work today</p>
          </div>
        </div>
      )}
    </>
  );
}
