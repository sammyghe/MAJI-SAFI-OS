'use client';

export default function MarketingPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Marketing</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Distributor pipeline, brand development</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'New Prospects', value: '0', color: 'text-green-400' },
          { label: 'Qualified', value: '0', color: 'text-blue-400' },
          { label: 'Converted', value: '0', color: 'text-purple-400' },
          { label: 'Sleep >7d', value: '0', color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-400 font-label">{stat.label}</p>
            <p className={`text-2xl font-bold font-headline ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 font-headline">Prospect Pipeline</h3>
        <p className="text-zinc-400 text-center font-label">No prospects logged yet</p>
      </div>
    </div>
  );
}
