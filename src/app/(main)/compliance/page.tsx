import { supabase } from '@/lib/supabase';
import ComplianceClient from './ComplianceClient';

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
        </div>
      </header>

      <ComplianceClient initialRecords={records} />
    </div>
  );
}
