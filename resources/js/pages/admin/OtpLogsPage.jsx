import React from 'react';

export default function OtpLogsPage() {
  const sampleLogs = [
    { id: 101, email: 'elena@healernet.org', type: 'registration', code: '123456', status: 'Used', expires: '5 mins remaining' },
    { id: 102, email: 'patient@healernet.org', type: 'login', code: '123456', status: 'Used', expires: 'Expired' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">OTP Verification Audit Logs</h2>
        <p className="text-sm text-slate-400">Monitor email verification codes and expiration timestamps.</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="px-6 py-3.5">ID</th>
              <th className="px-6 py-3.5">Recipient Email</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Code</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Expiration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sampleLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-mono text-slate-500">#{log.id}</td>
                <td className="px-6 py-4 font-semibold text-white">{log.email}</td>
                <td className="px-6 py-4 uppercase text-[10px] font-bold text-teal-400">{log.type}</td>
                <td className="px-6 py-4 font-mono tracking-widest text-emerald-400">{log.code}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">{log.expires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
