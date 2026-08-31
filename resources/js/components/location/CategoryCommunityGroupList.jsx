import { MessageCircle, ArrowRight } from 'lucide-react';

export default function CategoryCommunityGroupList({
  items = [],
  loading = false,
  cityName = '',
  regionName = '',
}) {
  if (loading) {
    return (
      <div className="py-6 text-center text-xs text-emerald-200/70 animate-pulse">
        Loading community groups…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
        No WhatsApp group links are set up for your district yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const hasLink = Boolean(item.whatsapp_url);
        const locationLine = [cityName, regionName].filter(Boolean).join(', ');

        return (
          <div
            key={item.category_id || item.category_name}
            className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#E5C158]">
              {item.category_name}
            </div>

            {hasLink ? (
              <>
                <div className="text-xs font-bold text-[#A3E635] mt-1">{item.name}</div>
                {item.description && (
                  <div className="text-[11px] text-slate-200 mt-0.5">{item.description}</div>
                )}
                {locationLine && (
                  <div className="text-[11px] text-slate-300 mt-0.5">{locationLine}</div>
                )}
                <a
                  href={item.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-lg shadow-[#25D366]/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <MessageCircle size={16} className="fill-white" />
                  Join WhatsApp Group
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </>
            ) : (
              <p className="text-[11px] text-amber-100/90 mt-2 leading-relaxed">
                {item.message || 'No WhatsApp group is currently available for this category in your city.'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
