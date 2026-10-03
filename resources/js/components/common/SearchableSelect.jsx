import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * Select2-style dropdown with a search box, used in place of a native <select>.
 * onChange receives a select-like event ({ target: { value } }), so existing
 * `(e) => handler(e.target.value)` code works unchanged.
 * Pass `multiple` + `max` for multi-select (value is an array of option values).
 */
export default function SearchableSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  noResultsText = 'No results found',
  disabled = false,
  className = '',
  style,
  multiple = false,
  max,
}) {
  const autoId = useId();
  const baseId = id || `searchable-select-${autoId}`;
  const listId = `${baseId}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selectedValues = useMemo(() => {
    if (!multiple) return [];
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }, [multiple, value]);

  const selected = multiple
    ? options.filter((opt) => selectedValues.includes(String(opt.value)))
    : options.find((opt) => String(opt.value) === String(value ?? ''));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => String(opt.label).toLowerCase().includes(q));
  }, [options, query]);

  const close = (focusButton = false) => {
    setOpen(false);
    setQuery('');
    if (focusButton) buttonRef.current?.focus();
  };

  const openList = () => {
    if (disabled) return;
    const selectedIndex = multiple
      ? options.findIndex((opt) => selectedValues.includes(String(opt.value)))
      : options.findIndex((opt) => String(opt.value) === String(value ?? ''));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setQuery('');
    setOpen(true);
  };

  const choose = (opt) => {
    if (!opt) return;

    if (multiple) {
      const id = String(opt.value);
      const already = selectedValues.includes(id);
      if (!already && max != null && selectedValues.length >= max) {
        return;
      }
      const next = already
        ? selectedValues.filter((v) => v !== id)
        : [...selectedValues, id];
      onChange?.({ target: { value: next } });
      return;
    }

    if (String(opt.value) !== String(value ?? '')) {
      onChange?.({ target: { value: String(opt.value) } });
    }
    close(true);
  };

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Focus the search box when opening.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Close if the field becomes disabled (e.g. parent value cleared) while open.
  useEffect(() => {
    if (disabled && open) close();
  }, [disabled, open]);

  // Keep the highlighted option in range and visible.
  useEffect(() => {
    if (!open) return;
    if (activeIndex > filtered.length - 1) {
      setActiveIndex(Math.max(0, filtered.length - 1));
      return;
    }
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, filtered.length]);

  const onButtonKeyDown = (e) => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const buttonLabel = multiple
    ? (selected.length ? selected.map((opt) => opt.label).join(', ') : placeholder)
    : (selected ? selected.label : placeholder);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={buttonRef}
        id={baseId}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`${className} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed`}
        style={style}
      >
        <span className={`truncate ${multiple ? (selected.length ? '' : 'opacity-80') : (selected ? '' : 'opacity-80')}`}>
          {buttonLabel}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-white/20 bg-[#071812] shadow-xl shadow-black/40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 border-b border-white/10">
            <Search size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={filtered[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              className="w-full h-10 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-slate-400" role="presentation">
                {noResultsText}
              </li>
            )}
            {filtered.map((opt, index) => {
              const isSelected = multiple
                ? selectedValues.includes(String(opt.value))
                : String(opt.value) === String(value ?? '');
              const isActive = index === activeIndex;
              const atMax = multiple && max != null && selectedValues.length >= max && !isSelected;
              return (
                <li
                  key={opt.value}
                  id={`${baseId}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={atMax || undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (atMax) return;
                    choose(opt);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm ${
                    atMax ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  } ${isActive ? 'bg-[#0F382C] text-white' : 'text-slate-100'} ${
                    isSelected ? 'font-semibold text-[#a3e635]' : ''
                  }`}
                >
                  {multiple && (
                    <span
                      className={`mt-px w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                        isSelected ? 'border-[#a3e635] bg-[#a3e635]/20' : 'border-white/30'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check size={11} />}
                    </span>
                  )}
                  <span className="truncate flex-1">{opt.label}</span>
                  {!multiple && isSelected && <Check size={14} className="shrink-0" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
