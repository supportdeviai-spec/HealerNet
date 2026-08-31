import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export const MAX_CATEGORIES = 3;

export default function CategorySelect2({
  categories = [],
  selectedIds = [],
  onChange,
  disabled = false,
  label = 'Category',
  required = true,
  error = '',
  labelClassName = '',
  id = 'register-categories',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const selectedCategories = useMemo(
    () => categories.filter((cat) => selectedSet.has(String(cat.id))),
    [categories, selectedSet]
  );

  const filteredCategories = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) => String(cat.name || '').toLowerCase().includes(term));
  }, [categories, query]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setQuery('');
    }
  }, [open]);

  const toggleCategory = (categoryId) => {
    const key = String(categoryId);
    const next = new Set(selectedSet);

    if (next.has(key)) {
      next.delete(key);
    } else if (next.size < MAX_CATEGORIES) {
      next.add(key);
    }

    onChange(Array.from(next));
  };

  const removeCategory = (categoryId) => {
    onChange(selectedIds.filter((id) => String(id) !== String(categoryId)));
  };

  const atMax = selectedIds.length >= MAX_CATEGORIES;
  const placeholder = disabled
    ? 'Loading categories…'
    : selectedCategories.length
      ? ''
      : 'Select up to 3 categories';

  return (
    <div className="category-select2-field" ref={rootRef}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled || categories.length === 0}
          onClick={() => setOpen((value) => !value)}
          className="w-full min-h-12 px-4 py-2 rounded-xl bg-[#071812] border border-white/20 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/40 focus:border-[#65A30D] transition-all disabled:opacity-60 flex items-center justify-between gap-3 text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {selectedCategories.length ? (
              selectedCategories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#65A30D]/20 text-[#D9F99D] px-2 py-0.5 text-xs font-semibold"
                >
                  {cat.name}
                  <button
                    type="button"
                    className="hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeCategory(cat.id);
                    }}
                    aria-label={`Remove ${cat.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full rounded-xl border border-white/15 bg-[#0A221A] shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#071812] px-3 py-2">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search categories…"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <ul className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
              {filteredCategories.length ? (
                filteredCategories.map((cat) => {
                  const checked = selectedSet.has(String(cat.id));
                  const optionDisabled = !checked && atMax;

                  return (
                    <li key={cat.id}>
                      <label
                        className={[
                          'flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm transition-colors cursor-pointer',
                          checked ? 'bg-[#65A30D]/20 text-[#D9F99D]' : 'text-slate-200 hover:bg-white/5',
                          optionDisabled ? 'opacity-50 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={optionDisabled}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        <span
                          aria-hidden="true"
                          className={[
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                            checked
                              ? 'border-[#65A30D] bg-[#65A30D] text-white'
                              : 'border-white/30 bg-[#071812]',
                            optionDisabled && !checked ? 'border-white/15' : '',
                          ].join(' ')}
                        >
                          {checked && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="font-medium truncate">{cat.name}</span>
                      </label>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-3 text-sm text-slate-400">No categories found.</li>
              )}
            </ul>

            <div className="px-3 py-2 border-t border-white/10 text-[11px] text-slate-400">
              {selectedIds.length}/{MAX_CATEGORIES} selected
              {atMax ? ' — maximum reached' : ''}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-500 font-medium mt-1.5">{error}</p>}
      <p className="text-[11px] text-slate-500 dark:text-emerald-200/60 mt-1.5">
        Search and select up to {MAX_CATEGORIES} healthcare specialties.
      </p>
    </div>
  );
}
