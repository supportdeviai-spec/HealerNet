import { MessageCircle, ArrowRight } from 'lucide-react';

export function normalizeCommunityGroup(group) {
  if (!group) return null;
  const whatsappUrl = group.whatsapp_url || group.whatsapp_link || null;
  if (!group.id && !group.name && !whatsappUrl) return null;
  return {
    ...group,
    whatsapp_url: whatsappUrl,
  };
}

export function mergeCommunityGroups(...sources) {
  const pool = [];
  const seen = new Set();

  sources.flat().forEach((item) => {
    const group = normalizeCommunityGroup(item);
    if (!group) return;
    const key = group.id || `${group.name}-${group.whatsapp_url}`;
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(group);
  });

  return pool;
}

export default function CommunityGroupList({
  groups = [],
  loading = false,
  emptyMessage = 'No local community groups are currently available.',
  cityName = '',
  regionName = '',
}) {
  const normalized = groups.map(normalizeCommunityGroup).filter(Boolean);
  const withLinks = normalized.filter((g) => g.whatsapp_url);

  if (loading) {
    return (
      <div className="py-6 text-center text-xs text-emerald-200/70 animate-pulse">
        Loading community groups…
      </div>
    );
  }

  if (!withLinks.length) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {withLinks.map((group) => (
        <div key={group.id || group.name} className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
          <div className="text-xs font-bold text-[#A3E635]">{group.name}</div>
          {group.description && (
            <div className="text-[11px] text-slate-200 mt-0.5">{group.description}</div>
          )}
          {(cityName || regionName) && (
            <div className="text-[11px] text-slate-300 mt-0.5">
              {[cityName, regionName].filter(Boolean).join(', ')}
            </div>
          )}
          <a
            href={group.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-lg shadow-[#25D366]/30 transition-all flex items-center justify-center gap-2 group"
          >
            <MessageCircle size={16} className="fill-white" />
            Join WhatsApp Group
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      ))}
    </div>
  );
}
