'use client';

export default function InventoryPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Inventory</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Stock levels, zero stockouts</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Stock', value: '0', color: 'bg-blue-500/10 text-blue-400' },
          { label: 'Below Threshold', value: '0', color: 'bg-red-500/10 text-red-400' },
          { label: 'Quarantined', value: '0', color: 'bg-yellow-500/10 text-yellow-400' },
          { label: 'Empty Jars', value: '0', color: 'bg-zinc-500/10 text-zinc-400' },
        ].map((stat, i) => (
          <div key={i} className={`p-4 border border-zinc-700 rounded-lg ${stat.color}`}>
            <p className="text-xs font-label opacity-70">{stat.label}</p>
            <p className="text-3xl font-bold font-headline">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 font-headline">Stock Status</h3>
        <p className="text-zinc-400 text-center font-label">No inventory data available</p>
      </div>
    </div>
  );
}
