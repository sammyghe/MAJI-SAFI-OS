import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import ComplianceClient from './ComplianceClient';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('maji_user_role')?.value;

  if (userRole !== 'founder' && userRole !== 'compliance') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Unauthorized Access</h2>
        <p className="text-gray-400">Only Founder or Compliance accounts may access this module.</p>
      </div>
    );
  }

  // Fetch regulatory records
  const { data: recordsData } = await supabase
    .from('compliance_records')
    .select('*')
    .order('expiry_date', { ascending: true });
    
  const records = recordsData || [];

  // Identify UNBS
  const unbsRecord = records.find(r => r.document_name.includes('UNBS'));
  const isExpiringSoon = unbsRecord && new Date(unbsRecord.expiry_date).getTime() < Date.now() + 1000 * 60 * 60 * 24 * 30; // Within 30 days

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">Regulatory & Compliance</h1>
        <p className="text-gray-400">Manage operating licenses, regulatory audits, and quality standards.</p>
      </div>

      {unbsRecord && (
        <div className={`p-6 rounded-[2rem] border shadow-2xl flex items-center justify-between ${
          isExpiringSoon 
            ? 'bg-orange-500/10 border-orange-500/50' 
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
               {isExpiringSoon && <AlertTriangle className="w-5 h-5 text-orange-400" />}
               Master UNBS Certification
            </h2>
            <p className={isExpiringSoon ? "text-orange-400 font-semibold" : "text-green-400 font-semibold"}>
              Status: {isExpiringSoon ? 'Renewal Critical' : 'Active'} • Expires {unbsRecord.expiry_date}
            </p>
          </div>
          {isExpiringSoon && (
            <button className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all">
              Initiate Renewal Flow
            </button>
          )}
        </div>
      )}

      <ComplianceClient initialRecords={records} />
    </div>
  );
}
