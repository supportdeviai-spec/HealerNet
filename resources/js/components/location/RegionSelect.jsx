import { Select } from '../admin/AdminShared';

export default function RegionSelect({
  value,
  onChange,
  regions = [],
  loading = false,
  disabled = false,
  label = '',
  placeholder = 'Select State',
  className = '',
  id = 'region-select',
  selectClassName = 'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#071812] border border-[#0F382C]/20 dark:border-[#1E4E3D] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 disabled:cursor-not-allowed disabled:opacity-70',
  selectStyle,
  t,
}) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      ) : null}
      {t ? (
        <Select
          t={t}
          value={value || ''}
          onChange={onChange}
          disabled={disabled || loading}
        >
          <option value="">{loading ? 'Loading states…' : placeholder}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </Select>
      ) : (
        <select
          id={id}
          value={value || ''}
          onChange={onChange}
          disabled={disabled || loading}
          required
          className={selectClassName}
          style={selectStyle}
        >
          <option value="">{loading ? 'Loading states…' : placeholder}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
