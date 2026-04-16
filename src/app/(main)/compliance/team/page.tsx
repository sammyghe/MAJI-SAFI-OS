'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Plus } from 'lucide-react';

export default function TeamPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('location_id', 'buziga')
          .order('name');

        if (error) throw error;
        setTeamMembers(data || []);
      } catch (error) {
        console.error('Error loading team:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 font-headline">Team Management</h1>
          <p className="text-zinc-400 text-sm font-label">Add members, assign roles and departments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0077B6] hover:brightness-110 text-white rounded-lg font-semibold text-sm font-label transition-all">
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Team Members Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-label">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Primary Dept</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-zinc-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    No team members yet
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white font-semibold">{member.name}</td>
                    <td className="px-4 py-3 text-zinc-300">{member.role}</td>
                    <td className="px-4 py-3 text-zinc-300">{member.department_slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          member.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-700/50 text-zinc-400'
                        }`}
                      >
                        {member.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-[#0077B6] hover:underline text-xs">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
