import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import EmployeeGrid from './EmployeeGrid';

export default async function HRPortalPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('maji_user_role')?.value;

  if (userRole !== 'founder') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Unauthorized Access</h2>
        <p className="text-gray-400">Only Founder-level accounts may access the Human Resources module.</p>
      </div>
    );
  }

  // Fetch all users for HR management
  const { data: usersData } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
    
  const users = usersData || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">Human Resources</h1>
        <p className="text-gray-400">Manage employee directories, contracts, and continuous performance tracking.</p>
      </div>

      {/* Top Dashboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" /> Today's Attendance Overview
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center">
              <p className="text-3xl font-black text-white">{(users.length * 0.85).toFixed(0)}</p>
              <p className="text-xs text-gray-400 mt-1">Checked In On Time</p>
            </div>
            <div className="flex-1 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
              <p className="text-3xl font-black text-red-400">2</p>
              <p className="text-xs text-gray-400 mt-1">Late / Absent</p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-6 italic">* Attendance log is currently operating in simulated demo mode.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Pending Contracts
          </h3>
          <div className="space-y-3">
            {users.filter(u => u.contract_status === 'Pending Signature' || !u.contract_status).length === 0 ? (
              <p className="text-sm text-gray-400 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-400"/> All employee contracts are active and signed.</p>
            ) : (
              users.filter(u => u.contract_status === 'Pending Signature' || !u.contract_status).slice(0, 3).map((u, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                  <p className="text-sm font-semibold text-white">{u.name}</p>
                  <p className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">Missing Signature</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Directory Component */}
      <EmployeeGrid initialUsers={users} />
    </div>
  );
}
