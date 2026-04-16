'use client';

export default function DispatchPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Dispatch</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Sales logging, cash collection tracking</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jars Dispatched', value: '0', suffix: '/' },
          { label: 'Cash Collected', value: 'UGX 0', suffix: '' },
          { label: 'Distributors', value: '0', suffix: '' },
          { label: 'Mismatch %', value: '0%', suffix: '' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-400 font-label">{stat.label}</p>
            <p className="text-2xl font-bold text-white font-headline">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 font-headline">Daily Sales</h3>
        <p className="text-zinc-400 text-center font-label">No sales logged today</p>
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-400 text-sm font-label">EOD Reconciliation: Button will appear after first sale logged</p>
      </div>
    </div>
  );
}
