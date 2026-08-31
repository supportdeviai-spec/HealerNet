import React from 'react';

const MAX_CATEGORIES = 3;

export default function CategoryMultiSelect({
  categories = [],
  selectedIds = [],
  onChange,
  disabled = false,
  label = 'Categories',
  required = true,
  error = '',
}) {
  const toggle = (id) => {
    if (disabled) return;
    const current = new Set(selectedIds.map(String));
    const key = String(id);
    if (current.has(key)) {
      current.delete(key);
    } else if (current.size < MAX_CATEGORIES) {
      current.add(key);
    }
    onChange(Array.from(current));
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200">
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-emerald-200/60">
            {selectedIds.length}/{MAX_CATEGORIES} selected
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {categories.map((cat) => {
          const checked = selectedIds.map(String).includes(String(cat.id));
          const atMax = selectedIds.length >= MAX_CATEGORIES && !checked;

          return (
            <label
              key={cat.id}
              className={[
                'flex items-start gap-2.5 p-3 rounded-xl border text-sm cursor-pointer transition-all',
                checked
                  ? 'border-[#65A30D] bg-[#65A30D]/10 text-slate-100'
                  : 'border-white/15 bg-[#071812] text-slate-200',
                (disabled || atMax) && !checked ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || atMax}
                onChange={() => toggle(cat.id)}
                className="mt-0.5"
              />
              <span>
                <span className="font-semibold block">{cat.name}</span>
                {cat.description && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">{cat.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-500 font-medium mt-1.5">{error}</p>}
      <p className="text-[11px] text-slate-500 dark:text-emerald-200/60 mt-1.5">
        Choose up to {MAX_CATEGORIES} healthcare specialties.
      </p>
    </div>
  );
}

export { MAX_CATEGORIES };
