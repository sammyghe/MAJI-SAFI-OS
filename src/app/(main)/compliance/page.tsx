'use client';

export default function CompliancePage() {
  const documents = [
    { name: 'UNBS License', daysLeft: 180 },
    { name: 'Food Safety Cert', daysLeft: 150 },
    { name: 'Environmental Permit', daysLeft: 90 },
    { name: 'Water Testing Report', daysLeft: 30 },
  ];

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Compliance</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">UNBS documents, HR records, legal registry</p>

      {/* Documents */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-label">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Document</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-zinc-300 font-semibold">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => {
                let statusColor = 'text-green-400';
                if (doc.daysLeft <= 7) statusColor = 'text-red-400';
                else if (doc.daysLeft <= 30) statusColor = 'text-yellow-400';

                return (
                  <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white">{doc.name}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${statusColor}`}>
                      {doc.daysLeft <= 7 ? 'ALERT' : doc.daysLeft <= 30 ? 'Warning' : 'Valid'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">{doc.daysLeft}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 font-headline">CAPA Log</h3>
          <p className="text-zinc-400 text-center font-label">No corrective actions logged</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 font-headline">Team Directory</h3>
          <p className="text-zinc-400 text-center font-label">
            <a href="/compliance/team" className="text-[#0077B6] hover:underline">View team members</a>
          </p>
        </div>
      </div>
    </div>
  );
}
