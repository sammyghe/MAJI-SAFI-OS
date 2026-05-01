import { supabase } from '@/lib/supabase';
import ComplianceClient from './ComplianceClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  let records: any[] = [];
  try {
    const { data } = await supabase
      .from('compliance_records')
      .select('*')
      .eq('location_id', 'buziga')
      .order('expiry_date', { ascending: true });
    records = data ?? [];
  } catch (_) {}

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase mb-2 block font-label">
              Compliance Gateway
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight font-headline">
              Compliance – UNBS &amp; HR
            </h2>
          </div>
          <div className="flex gap-3">
            <Link
              href="/compliance/gaps"
              className="bg-surface-container-high text-on-surface text-xs font-bold px-4 py-2 font-label hover:bg-surface-container-highest transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">warning</span>
              UNBS Gaps
            </Link>
            <a
              href="/api/inspector-pack"
              download="Maji_Safi_Inspector_Pack.pdf"
              className="bg-primary text-on-primary text-xs font-bold px-4 py-2 font-label hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Inspector Pack PDF
            </a>
          </div>
        </div>
      </header>

      <ComplianceClient initialRecords={records} />
    </div>
  );
}
