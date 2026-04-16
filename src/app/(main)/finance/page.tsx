'use client';

export default function FinancePage() {
  const categories = [
    'Chemicals',
    'Caps',
    'Labels',
    'Salaries',
    'Transport',
    'UNBS Fees',
    'Utilities',
    'Misc',
  ];

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Finance</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Daily P&L, break-even tracking, cash reconciliation</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-400 text-xs font-label">Break-Even Jars</p>
          <p className="text-3xl font-bold text-white font-headline">220-240</p>
          <p className="text-xs text-zinc-500 font-label">Today: 0</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-400 text-xs font-label">Daily P&L</p>
          <p className="text-3xl font-bold text-white font-headline">UGX 0</p>
          <p className="text-xs text-zinc-500 font-label">Revenue - Expenses</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-400 text-xs font-label">Cash Position</p>
          <p className="text-3xl font-bold text-white font-headline">UGX 0</p>
          <p className="text-xs text-zinc-500 font-label">Includes MoMo & Bank</p>
        </div>
      </div>

      {/* Envelope Ledger */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-label">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Category</th>
                <th className="px-4 py-3 text-right text-zinc-300 font-semibold">Budgeted</th>
                <th className="px-4 py-3 text-right text-zinc-300 font-semibold">Spent</th>
                <th className="px-4 py-3 text-right text-zinc-300 font-semibold">Remaining</th>
                <th className="px-4 py-3 text-right text-zinc-300 font-semibold">% Used</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-white">{cat}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">UGX 0</td>
                  <td className="px-4 py-3 text-right text-zinc-300">UGX 0</td>
                  <td className="px-4 py-3 text-right text-zinc-300">UGX 0</td>
                  <td className="px-4 py-3 text-right text-zinc-300">0%</td>
                </tr>
              ))}
              <tr className="bg-zinc-800/50 font-semibold">
                <td className="px-4 py-3 text-white">TOTAL</td>
                <td className="px-4 py-3 text-right text-white">UGX 0</td>
                <td className="px-4 py-3 text-right text-white">UGX 0</td>
                <td className="px-4 py-3 text-right text-white">UGX 0</td>
                <td className="px-4 py-3 text-right text-white">0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mt-4 font-label">
        All numbers require source verification. See CLAUDE.md rule 5 for anti-hallucination policy.
      </p>
    </div>
  );
}
