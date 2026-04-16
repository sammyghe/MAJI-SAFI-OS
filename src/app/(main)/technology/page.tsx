'use client';

export default function TechnologyPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Technology</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">System health, integrations, morning brief delivery</p>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Supabase', status: 'Connected', color: 'text-green-400' },
          { label: 'Last Cron Job', status: 'Running', color: 'text-green-400' },
          { label: 'Uptime', status: '99%', color: 'text-green-400' },
        ].map((sys, i) => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-400 font-label">{sys.label}</p>
            <p className={`text-xl font-bold font-headline ${sys.color}`}>{sys.status}</p>
          </div>
        ))}
      </div>

      {/* Audit Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 font-headline">System Audit Log</h3>
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 font-label">Last 50 events across all departments</p>
          <p className="text-zinc-400 text-center font-label">No events logged yet</p>
        </div>
      </div>
    </div>
  );
}
