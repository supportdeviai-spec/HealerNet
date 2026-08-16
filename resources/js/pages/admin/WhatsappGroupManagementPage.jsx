import React, { useState } from 'react';

export default function WhatsappGroupManagementPage() {
  const [groups, setGroups] = useState([
    { id: 1, name: 'HealerNet Global Community #1', category: 'General', capacity: 256, members: 142, link: 'https://chat.whatsapp.com/HealerNetCommunity01', status: 'Active' },
    { id: 2, name: 'Clinical Practitioners Circle', category: 'Practitioners', capacity: 256, members: 89, link: 'https://chat.whatsapp.com/PractitionerCircle01', status: 'Active' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">WhatsApp Group Management</h2>
          <p className="text-sm text-slate-400">Manage community groups, link assignments, and member capacities.</p>
        </div>

        <button
          onClick={() => alert('New WhatsApp Group creation modal.')}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all"
        >
          + Create New Group
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-[10px] font-bold uppercase tracking-wider border border-teal-500/30">
                  {group.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{group.name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {group.status}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Capacity Usage:</span>
                <span className="font-semibold text-white">{group.members} / {group.capacity} Members</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all"
                  style={{ width: `${(group.members / group.capacity) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <a
                href={group.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>??</span> Open Invite Link
              </a>
              <button
                onClick={() => alert(`Editing WhatsApp group ${group.name}`)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Edit Group
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
