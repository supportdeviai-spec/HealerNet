import React from 'react';

export default function ActivityLogsPage() {
  const sampleActivities = [
    { id: 301, user: 'HealerNet Administrator', action: 'CREATE_WHATSAPP_GROUP', details: 'Created Community Group #1', ip: '127.0.0.1', time: '15 mins ago' },
    { id: 302, user: 'Dr. Elena Rostova', action: 'USER_LOGIN', details: 'Authenticated via Sanctum Mobile OTP', ip: '127.0.0.1', time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Activity Audit Trail</h2>
        <p className="text-sm text-slate-400">Security audit records, system logins, and operational changes.</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="px-6 py-3.5">ID</th>
              <th className="px-6 py-3.5">User</th>
              <th className="px-6 py-3.5">Action Key</th>
              <th className="px-6 py-3.5">Description</th>
              <th className="px-6 py-3.5">IP Address</th>
              <th className="px-6 py-3.5">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sampleActivities.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-mono text-slate-500">#{log.id}</td>
                <td className="px-6 py-4 font-semibold text-white">{log.user}</td>
                <td className="px-6 py-4 font-mono text-[10px] text-purple-400 font-bold">{log.action}</td>
                <td className="px-6 py-4 text-slate-300">{log.details}</td>
                <td className="px-6 py-4 font-mono text-slate-400">{log.ip}</td>
                <td className="px-6 py-4 text-slate-400">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
