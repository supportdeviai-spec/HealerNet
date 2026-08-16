import React from 'react';

export default function EmailLogsPage() {
  const sampleLogs = [
    { id: 201, recipient: 'admin@healernet.org', subject: 'Welcome to HealerNet Global', status: 'Sent via Mailpit', time: '10 mins ago' },
    { id: 202, recipient: 'elena@healernet.org', subject: 'Your WhatsApp Group Assignment', status: 'Sent via Mailpit', time: '1 hour ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Email Delivery Logs</h2>
        <p className="text-sm text-slate-400">Track outgoing welcome emails, OTP notices, and Mailpit queue status.</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="px-6 py-3.5">ID</th>
              <th className="px-6 py-3.5">Recipient</th>
              <th className="px-6 py-3.5">Subject</th>
              <th className="px-6 py-3.5">Delivery Status</th>
              <th className="px-6 py-3.5">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sampleLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-mono text-slate-500">#{log.id}</td>
                <td className="px-6 py-4 font-semibold text-white">{log.recipient}</td>
                <td className="px-6 py-4 text-slate-300">{log.subject}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
