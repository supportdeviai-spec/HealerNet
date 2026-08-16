import React, { useState } from 'react';

export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const sampleUsers = [
    { id: 1, name: 'HealerNet Administrator', email: 'admin@healernet.org', role: 'admin', status: 'active', group: 'Community #1' },
    { id: 2, name: 'Dr. Elena Rostova', email: 'elena@healernet.org', role: 'practitioner', status: 'active', group: 'Practitioner Circle' },
    { id: 3, name: 'Alexander Wright', email: 'patient@healernet.org', role: 'patient', status: 'active', group: 'Community #1' },
  ];

  const filteredUsers = sampleUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-sm text-slate-400">Manage user accounts, roles, and status.</p>
        </div>

        <button
          onClick={() => alert('New User creation modal opened.')}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all self-start"
        >
          + Add New User
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="px-6 py-3.5">ID</th>
              <th className="px-6 py-3.5">Name</th>
              <th className="px-6 py-3.5">Email</th>
              <th className="px-6 py-3.5">Role</th>
              <th className="px-6 py-3.5">WhatsApp Group</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-mono text-slate-500">#{user.id}</td>
                <td className="px-6 py-4 font-semibold text-white">{user.name}</td>
                <td className="px-6 py-4 text-slate-400">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    user.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    user.role === 'practitioner' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300">{user.group}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => alert(`Editing user ${user.name}`)} className="text-purple-400 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
