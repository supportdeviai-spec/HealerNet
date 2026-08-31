import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { locationApi } from '../../services/locationApi';
import { useCountries } from '../../hooks/useCountries';
import LocationPicker from '../../components/location/LocationPicker';
import {
  AlertTriangle,
  Download,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { WhatsAppCommunityImportButton } from '../../components/admin/WhatsAppCommunityImportModal';
import {
  Button,
  Card,
  EmptyState,
  exportToCSV,
  exportToExcel,
  Field,
  FONT_DISPLAY,
  Input,
  MenuItem,
  Modal,
  Pagination,
  Select,
  StatusBadge,
  TableToolbar,
  Th,
  ActionsTh,
  RefreshButton,
  refreshTableStyle,
  BRAND,
  inputStyle,
} from '../../components/admin/AdminShared';

const TABS = [
  { id: 'countries', label: 'Countries', singular: 'Country' },
  { id: 'regions', label: 'States', singular: 'State' },
  { id: 'cities', label: 'Districts', singular: 'District' },
];

const PAGE_SIZE = 10;

const createTabState = () => ({ items: [], meta: {}, loaded: false });

const INITIAL_TAB_DATA = {
  countries: createTabState(),
  regions: createTabState(),
  cities: createTabState(),
};

const createTabUi = () => ({
  query: '',
  debouncedQuery: '',
  statusFilter: 'All',
  page: 1,
  filters: { countryId: '', regionId: '', cityId: '' },
});

const INITIAL_TAB_UI = {
  countries: createTabUi(),
  regions: createTabUi(),
  cities: createTabUi(),
};

const selKey = (id) => String(id);

const LocationRow = memo(function LocationRow({ t, item, detail, checked, onCheck, onEdit, onToggleStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isActive = (item.status || 'active').toLowerCase() === 'active';

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>
        {item.name || '—'}
      </td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{detail}</td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={item.status} /></td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}>
          <MoreVertical size={16} />
        </button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-52 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            <MenuItem t={t} icon={Pencil} label="Edit" onClick={() => { onEdit(); setOpen(false); }} />
            {isActive
              ? <MenuItem t={t} icon={UserX} label="Inactive" onClick={() => { onToggleStatus(); setOpen(false); }} />
              : <MenuItem t={t} icon={UserCheck} label="Activate" onClick={() => { onToggleStatus(); setOpen(false); }} />}
            {onDelete && (
              <>
                <div className="border-t" style={{ borderColor: t.border }} />
                <MenuItem
                  t={t}
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => {
                    setOpen(false);
                    onDelete(item);
                  }}
                />
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
});

const LocationTabPanel = memo(function LocationTabPanel({
  t,
  tabDef,
  isActive,
  ui,
  data,
  panelSelected,
  panelSort,
  items,
  panelError,
  showLoading,
  showRefreshing,
  countries,
  onQueryChange,
  onStatusFilterChange,
  onCountryFilterChange,
  onLocationFilterChange,
  onRefresh,
  onBulkDelete,
  onSort,
  onToggleAll,
  onToggle,
  onEdit,
  onToggleStatus,
  onOpenCreate,
  onRetry,
  onPageChange,
  detailFor,
  onDelete,
}) {
  const tabId = tabDef.id;
  const sortedItems = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      const av = a[panelSort.key] ?? '';
      const bv = b[panelSort.key] ?? '';
      const res = String(av).localeCompare(String(bv));
      return panelSort.dir === 'asc' ? res : -res;
    });
    return rows;
  }, [items, panelSort]);

  const panelTotal = data.meta.total ?? sortedItems.length;
  const panelTotalPages = data.meta.last_page ?? Math.max(1, Math.ceil(panelTotal / PAGE_SIZE));
  const colSpan = 5;

  return (
    <div style={{ display: isActive ? 'block' : 'none' }} aria-hidden={!isActive}>
      <TableToolbar
        t={t}
        query={ui.query}
        setQuery={onQueryChange}
        placeholder={`Search ${tabDef.label.toLowerCase()}…`}
        right={
          <>
            {panelSelected.size > 0 && (
              <Button size="sm" variant="danger" icon={Trash2} onClick={onBulkDelete}>
                Delete ({panelSelected.size})
              </Button>
            )}
            <Select
              t={t}
              className="w-auto min-w-[110px]"
              value={ui.statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              {['All', 'Active', 'Inactive'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            {tabId === 'regions' && (
              <Select
                t={t}
                className="w-auto min-w-[160px]"
                value={ui.filters.countryId}
                onChange={(e) => onCountryFilterChange(e.target.value)}
              >
                <option value="">All Countries</option>
                {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <RefreshButton t={t} refreshing={showRefreshing} onClick={onRefresh} className="ml-auto" />
          </>
        }
      />

      {tabId === 'cities' && (
        <div className="px-4 pb-4 border-b relative z-10" style={{ borderColor: t.border }}>
          <LocationPicker
            variant="admin"
            t={t}
            selectStyle={inputStyle(t)}
            countryId={ui.filters.countryId}
            regionId={ui.filters.regionId}
            cityId={ui.filters.cityId}
            cityPlaceholder={!ui.filters.regionId ? 'Select state first' : 'Select District'}
            cityLoadingPlaceholder="Loading districts…"
            onCountryChange={(value) => onLocationFilterChange({ countryId: value, regionId: '', cityId: '' })}
            onRegionChange={(value) => onLocationFilterChange({ ...ui.filters, regionId: value, cityId: '' })}
            onCityChange={(value) => onLocationFilterChange({ ...ui.filters, cityId: value })}
          />
        </div>
      )}

      {isActive && panelError && (
        <div className="p-4 text-center text-sm font-medium text-red-500 flex items-center justify-center gap-2">
          <AlertTriangle size={16} /> {panelError}
          <Button size="sm" variant="outline" onClick={onRetry} className="ml-2">Retry</Button>
        </div>
      )}

      <div className="overflow-x-auto" style={refreshTableStyle(showRefreshing && isActive)}>
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={sortedItems.length > 0 && sortedItems.every((r) => panelSelected.has(selKey(r.id)))}
                  onChange={onToggleAll}
                />
              </th>
              <Th t={t} label={tabId === 'cities' ? 'District' : 'Name'} sortKey="name" sort={panelSort} onSort={onSort} />
              <Th t={t} label="Details" />
              <Th t={t} label="Status" />
              <ActionsTh t={t} />
            </tr>
          </thead>
          <tbody>
            {showLoading ? (
              <tr className="border-t" style={{ borderColor: t.border }}>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-sm" style={{ color: t.textMuted }}>
                  Loading…
                </td>
              </tr>
            ) : sortedItems.length > 0 ? (
              sortedItems.map((item) => (
                <LocationRow
                  key={item.id}
                  t={t}
                  item={item}
                  detail={detailFor(tabId, item)}
                  checked={panelSelected.has(selKey(item.id))}
                  onCheck={() => onToggle(item.id)}
                  onEdit={() => onEdit(item)}
                  onToggleStatus={() => onToggleStatus(item)}
                  onDelete={onDelete}
                />
              ))
            ) : null}
          </tbody>
        </table>

        {!showLoading && sortedItems.length === 0 && !(isActive && panelError) && (
          <EmptyState
            t={t}
            title={`No ${tabDef.label.toLowerCase()} found`}
            sub={panelTotal === 0
              ? 'No location records exist yet. Use "Add" to create one, or run: php artisan db:seed --class=LocationSeeder'
              : (ui.debouncedQuery.trim() || ui.statusFilter !== 'All' || ui.filters.countryId || ui.filters.regionId || ui.filters.cityId)
                ? 'Try clearing your search or filters to see more results.'
                : 'No records match the current view.'}
            action={panelTotal === 0 && isActive ? (
              <Button size="sm" icon={Plus} onClick={onOpenCreate}>
                Add {tabDef.singular || 'Item'}
              </Button>
            ) : null}
          />
        )}
      </div>

      <Pagination
        t={t}
        page={ui.page}
        totalPages={panelTotalPages}
        onPage={onPageChange}
        total={panelTotal}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
});

export default function LocationManagementPage({ t, toast, onNav }) {
  const [tab, setTab] = useState('countries');
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['countries']));
  const [fetchingTab, setFetchingTab] = useState(null);
  const [refreshingTab, setRefreshingTab] = useState(null);
  const [error, setError] = useState(null);
  const [tabData, setTabData] = useState(INITIAL_TAB_DATA);
  const [tabUi, setTabUi] = useState(INITIAL_TAB_UI);
  const [selectedByTab, setSelectedByTab] = useState({
    countries: new Set(),
    regions: new Set(),
    cities: new Set(),
  });
  const [sortByTab, setSortByTab] = useState({
    countries: { key: 'name', dir: 'asc' },
    regions: { key: 'name', dir: 'asc' },
    cities: { key: 'name', dir: 'asc' },
  });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const tabDataRef = useRef(tabData);
  const fetchKeysRef = useRef(new Set());
  const activeTabRef = useRef(tab);
  const skipNextFetchRef = useRef(null);
  tabDataRef.current = tabData;
  activeTabRef.current = tab;

  const { countries } = useCountries();
  const activeTab = TABS.find((x) => x.id === tab);
  const currentUi = tabUi[tab];
  const currentTabState = tabData[tab] || createTabState();
  const total = currentTabState.meta.total ?? currentTabState.items.length;

  const updateUi = useCallback((tabId, patch) => {
    setTabUi((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], ...patch },
    }));
  }, []);

  const switchTab = useCallback((nextTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    setVisitedTabs((prev) => (prev.has(nextTab) ? prev : new Set(prev).add(nextTab)));
    setError(null);
  }, [tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTabUi((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], debouncedQuery: prev[tab].query, page: 1 },
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUi.query, tab]);

  const loadItemsForTab = useCallback(async (tabId, uiOverride, options = {}) => {
    const ui = uiOverride ?? tabUi[tabId];
    const background = options.background === true;
    const existing = tabDataRef.current[tabId];
    const canBackground = background && existing?.loaded;

    if (canBackground) {
      setRefreshingTab(tabId);
    } else if (!existing?.loaded) {
      setFetchingTab(tabId);
    }

    try {
      const params = {
        per_page: PAGE_SIZE,
        page: ui.page,
      };
      if (ui.debouncedQuery.trim()) params.search = ui.debouncedQuery.trim();
      if (ui.statusFilter !== 'All') params.status = ui.statusFilter.toLowerCase();

      let res;
      if (tabId === 'countries') res = await locationApi.adminListCountries(params);
      else if (tabId === 'regions') {
        if (ui.filters.countryId) params.country_id = ui.filters.countryId;
        res = await locationApi.adminListRegions(params);
      } else {
        if (ui.filters.countryId) params.country_id = ui.filters.countryId;
        if (ui.filters.regionId) params.region_id = ui.filters.regionId;
        res = await locationApi.adminListCities(params);
      }

      const nextItems = Array.isArray(res.data) ? res.data : [];
      const nextMeta = res.meta || {};
      setTabData((prev) => ({
        ...prev,
        [tabId]: { items: nextItems, meta: nextMeta, loaded: true },
      }));
      fetchKeysRef.current.add(JSON.stringify({
        tabId,
        debouncedQuery: ui.debouncedQuery,
        statusFilter: ui.statusFilter,
        filters: ui.filters,
        page: ui.page,
      }));
      if (tabId === activeTabRef.current) setError(null);
    } catch (e) {
      if (tabId === activeTabRef.current) {
        const message = e?.message || 'Failed to load location data';
        setError(message);
        toast?.(message, 'error');
      }
    } finally {
      setFetchingTab((current) => (current === tabId ? null : current));
      setRefreshingTab((current) => (current === tabId ? null : current));
    }
  }, [tabUi, toast]);

  useEffect(() => {
    if (skipNextFetchRef.current === tab) {
      skipNextFetchRef.current = null;
      return;
    }
    const ui = tabUi[tab];
    const fetchKey = JSON.stringify({
      tabId: tab,
      debouncedQuery: ui.debouncedQuery,
      statusFilter: ui.statusFilter,
      filters: ui.filters,
      page: ui.page,
    });
    const cached = tabDataRef.current[tab];
    const pageInSync = Number(cached?.meta?.current_page) === Number(ui.page);
    if (fetchKeysRef.current.has(fetchKey) && cached?.loaded && pageInSync) {
      return;
    }
    loadItemsForTab(tab);
  }, [
    tab,
    tabUi[tab].debouncedQuery,
    tabUi[tab].statusFilter,
    tabUi[tab].page,
    tabUi[tab].filters.countryId,
    tabUi[tab].filters.regionId,
    tabUi[tab].filters.cityId,
    loadItemsForTab,
  ]);

  const getSortedItems = useCallback((tabId) => {
    const rows = [...(tabData[tabId]?.items || [])];
    const sortState = sortByTab[tabId];
    rows.sort((a, b) => {
      const av = a[sortState.key] ?? '';
      const bv = b[sortState.key] ?? '';
      const res = String(av).localeCompare(String(bv));
      return sortState.dir === 'asc' ? res : -res;
    });
    return rows;
  }, [tabData, sortByTab]);

  const detailFor = useCallback((tabId, item) => {
    if (tabId === 'countries') return `${item.code || '-'} · ${item.phone_code || '-'}`;
    if (tabId === 'regions') {
      const districts = item.cities_count ?? 0;
      return `${item.country?.name || '-'} · ${districts} district${districts === 1 ? '' : 's'}`;
    }
    return `${item.region?.country?.name || '-'} · ${item.region?.name || '-'}`;
  }, []);

  const onSort = (tabId, key) => {
    setSortByTab((prev) => ({
      ...prev,
      [tabId]: {
        key,
        dir: prev[tabId].key === key && prev[tabId].dir === 'asc' ? 'desc' : 'asc',
      },
    }));
  };

  const setSelectedForTab = (tabId, next) => {
    setSelectedByTab((prev) => ({ ...prev, [tabId]: next }));
  };

  const toggleAll = (tabId) => {
    const sortedItems = getSortedItems(tabId);
    const selected = selectedByTab[tabId];
    const ids = sortedItems.map((r) => selKey(r.id));
    const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)));
    setSelectedForTab(tabId, next);
  };

  const toggle = (tabId, id) => {
    const key = selKey(id);
    const next = new Set(selectedByTab[tabId]);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelectedForTab(tabId, next);
  };

  const clearTabFetchCache = (tabId) => {
    for (const key of [...fetchKeysRef.current]) {
      try {
        if (JSON.parse(key).tabId === tabId) fetchKeysRef.current.delete(key);
      } catch {
        /* ignore malformed keys */
      }
    }
  };

  const invalidateTabCache = (tabId) => {
    const ui = tabUi[tabId];
    fetchKeysRef.current.delete(JSON.stringify({
      tabId,
      debouncedQuery: ui.debouncedQuery,
      statusFilter: ui.statusFilter,
      filters: ui.filters,
      page: ui.page,
    }));
  };

  const toggleStatusFor = async (tabId, item) => {
    const next = item.status === 'active' ? 'inactive' : 'active';
    try {
      if (tabId === 'countries') await locationApi.adminToggleCountryStatus(item.id, next);
      if (tabId === 'regions') await locationApi.adminToggleRegionStatus(item.id, next);
      if (tabId === 'cities') await locationApi.adminToggleCityStatus(item.id, next);
      toast?.(
        next === 'inactive'
          ? 'Marked inactive — hidden from registration; existing users are not affected'
          : 'Activated successfully',
        'success'
      );
      invalidateTabCache(tabId);
      loadItemsForTab(tabId, undefined, { background: true });
    } catch {
      toast?.('Failed to update status', 'error');
    }
  };

  const bulkDelete = (tabId) => {
    const items = tabData[tabId]?.items || [];
    const selected = selectedByTab[tabId];
    const selectedItems = items.filter((i) => selected.has(selKey(i.id)));
    if (!selectedItems.length) return;

    const noun = locationNoun(tabId);
    const plural = selectedItems.length === 1 ? noun : `${noun === 'country' ? 'countries' : `${noun}s`}`;
    setConfirmDelete({
      tab: tabId,
      items: selectedItems,
      title: `Permanently delete ${selectedItems.length} ${plural}?`,
      text: [
        'Are you sure you want to permanently delete the selected item(s)?',
        '',
        'Delete only happens if there are no registered members and no child locations.',
        'A state cannot be deleted until all districts under it are deleted.',
        'Items still in use will be skipped and you will see the exact reason.',
        '',
        'This cannot be undone.',
      ].join('\n'),
    });
  };

  const locationNoun = (tabId) => {
    if (tabId === 'countries') return 'country';
    if (tabId === 'regions') return 'state';
    return 'district';
  };

  const locationDeleteSummary = (tabId, item) => {
    const lines = ['Are you sure you want to permanently delete this item?', ''];
    if (tabId === 'countries') {
      lines.push(`States: ${item.regions_count ?? 0}`, `Registered members: ${item.users_count ?? 0}`, '');
    } else if (tabId === 'regions') {
      lines.push(`Districts: ${item.cities_count ?? 0}`, `Registered members: ${item.users_count ?? 0}`, '');
      if ((item.cities_count ?? 0) > 0) {
        lines.push('This state cannot be deleted until those districts are deleted.', '');
      }
    } else if (tabId === 'cities') {
      lines.push(`Registered members: ${item.users_count ?? 0}`, '');
    }
    lines.push('This cannot be undone. The admin account is not counted as a registered member.');
    return lines.join('\n');
  };

  const requestDeleteLocation = (item) => {
    const noun = locationNoun(tab);
    setConfirmDelete({
      tab,
      items: [item],
      title: `Permanently delete this ${noun}?`,
      text: locationDeleteSummary(tab, item),
    });
  };

  const deleteLocationItem = (tabId, item) => {
    if (tabId === 'countries') return locationApi.adminDeleteCountry(item.id);
    if (tabId === 'regions') return locationApi.adminDeleteRegion(item.id);
    return locationApi.adminDeleteCity(item.id);
  };

  const confirmPendingDelete = async () => {
    const items = confirmDelete?.items || [];
    const tabId = confirmDelete?.tab;
    if (!items.length || !tabId) return;
    setDeleting(true);
    let deleted = 0;
    const blocked = [];
    try {
      for (const item of items) {
        try {
          await deleteLocationItem(tabId, item);
          deleted++;
        } catch (err) {
          blocked.push(`${item.name || 'Item'}: ${err?.message || 'Cannot delete'}`);
        }
      }
      if (deleted && !blocked.length) {
        toast?.(`${deleted} deleted`, 'success');
      } else if (deleted && blocked.length) {
        toast?.(
          `${deleted} deleted, ${blocked.length} blocked.\n${blocked.slice(0, 3).join('\n')}${blocked.length > 3 ? '\n…' : ''}`,
          'error',
        );
      } else {
        toast?.(blocked[0] || 'Cannot delete items that are still in use', 'error');
      }
      setConfirmDelete(null);
      setSelectedForTab(tabId, new Set());
      clearTabFetchCache(tabId);
      if (tabId === 'countries') {
        clearTabFetchCache('regions');
        clearTabFetchCache('cities');
      }
      if (tabId === 'regions') {
        clearTabFetchCache('cities');
      }
      loadItemsForTab(tabId, undefined, { background: true });
    } finally {
      setDeleting(false);
    }
  };

  const exportAs = (fmt) => {
    const sortedItems = getSortedItems(tab);
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'details', label: 'Details' },
      { key: 'status', label: 'Status' },
    ];
    const exportData = sortedItems.map((item) => ({
      name: item.name || '-',
      details: detailFor(tab, item),
      status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Active',
    }));
    const filename = `HealerNet_Locations_${activeTab?.label.replace(/\s+/g, '_') || tab}`;
    if (fmt === 'CSV') exportToCSV(filename, exportData, columns, toast);
    else exportToExcel(filename, exportData, columns, toast);
  };

  const openCreate = () => {
    const filters = currentUi.filters;
    if (tab === 'countries') setForm({ name: '', code: '', phone_code: '', status: 'active' });
    if (tab === 'regions') setForm({ country_id: filters.countryId || '', name: '', code: '', type: 'state', status: 'active' });
    if (tab === 'cities') setForm({
      region_id: filters.regionId || '',
      name: '',
      status: 'active',
      country_id: filters.countryId || '',
    });
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => {
    const filters = currentUi.filters;
    setForm({
      ...item,
      name: item.name || '',
      status: String(item.status?.value || item.status || 'active').toLowerCase(),
      country_id: item.region?.country?.id ?? item.country_id ?? filters.countryId ?? '',
      region_id: item.region_id ?? item.region?.id ?? filters.regionId ?? '',
    });
    setModal({ mode: 'edit', id: item.id });
  };

  const saveItem = async () => {
    try {
      if (tab === 'countries') await locationApi.adminSaveCountry(form, modal.mode === 'edit' ? modal.id : null);
      if (tab === 'regions') await locationApi.adminSaveRegion(form, modal.mode === 'edit' ? modal.id : null);
      if (tab === 'cities') {
        const regionId = Number(form.region_id);
        if (!regionId) {
          toast?.('Select a state before saving this district', 'error');
          return;
        }
        if (!String(form.name || '').trim()) {
          toast?.('District name is required', 'error');
          return;
        }
        const payload = {
          region_id: regionId,
          name: String(form.name).trim(),
          status: String(form.status?.value || form.status || 'active').toLowerCase(),
        };
        await locationApi.adminSaveCity(payload, modal.mode === 'edit' ? modal.id : null);
      }
      toast?.('Saved successfully', 'success');
      setModal(null);
      clearTabFetchCache(tab);
      loadItemsForTab(tab, undefined, { background: true });
    } catch (e) {
      toast?.(e?.message || 'Validation failed', 'error');
    }
  };

  const refreshFilters = (tabId) => {
    clearTabFetchCache(tabId);
    const freshUi = createTabUi();
    skipNextFetchRef.current = tabId;
    setSelectedForTab(tabId, new Set());
    if (tabId === activeTabRef.current) setError(null);
    setTabUi((prev) => ({
      ...prev,
      [tabId]: freshUi,
    }));
    loadItemsForTab(tabId, freshUi, { background: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>
            Location Management
          </div>
          <div className="text-sm" style={{ color: t.textMuted }}>
            {Number(total || 0).toLocaleString()} {activeTab?.label.toLowerCase() || 'items'} in database
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WhatsAppCommunityImportButton
            t={t}
            toast={toast}
            onImported={() => {
              ['countries', 'regions', 'cities'].forEach((tabId) => {
                clearTabFetchCache(tabId);
                if (visitedTabs.has(tabId)) {
                  loadItemsForTab(tabId, undefined, { background: true });
                }
              });
            }}
          />
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs('CSV')} style={{ color: t.text, borderColor: t.border }}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs('Excel')} style={{ color: t.text, borderColor: t.border }}>Excel</Button>
          <Button size="sm" icon={Plus} onClick={openCreate}>
            Add {activeTab?.singular || 'Item'}
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-1"
        role="tablist"
        aria-label="Location sections"
      >
        {TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => switchTab(item.id)}
              className="px-4 py-2.5 text-sm rounded-lg hover:bg-black/[0.03]"
              style={{
                color: isActive ? BRAND.primaryDark : t.textMuted,
                background: isActive ? BRAND.primaryLight : 'transparent',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Card t={t}>
        {TABS.map((tabDef) => {
          if (!visitedTabs.has(tabDef.id)) return null;
          const tabId = tabDef.id;
          const data = tabData[tabId] || createTabState();
          return (
            <LocationTabPanel
              key={tabId}
              t={t}
              tabDef={tabDef}
              isActive={tab === tabId}
              ui={tabUi[tabId]}
              data={data}
              panelSelected={selectedByTab[tabId]}
              panelSort={sortByTab[tabId]}
              items={data.items}
              panelError={tab === tabId ? error : null}
              showLoading={fetchingTab === tabId && !data.loaded}
              showRefreshing={refreshingTab === tabId}
              countries={countries}
              onQueryChange={(value) => updateUi(tabId, { query: value })}
              onStatusFilterChange={(value) => updateUi(tabId, { statusFilter: value, page: 1 })}
              onCountryFilterChange={(value) => updateUi(tabId, { filters: { countryId: value, regionId: '', cityId: '' } })}
              onLocationFilterChange={(filters) => updateUi(tabId, { filters })}
              onRefresh={() => refreshFilters(tabId)}
              onBulkDelete={() => bulkDelete(tabId)}
              onSort={(key) => onSort(tabId, key)}
              onToggleAll={() => toggleAll(tabId)}
              onToggle={(id) => toggle(tabId, id)}
              onEdit={(item) => openEdit(item)}
              onToggleStatus={(item) => toggleStatusFor(tabId, item)}
              onOpenCreate={openCreate}
              onRetry={() => loadItemsForTab(tabId)}
              onPageChange={(value) => updateUi(tabId, { page: value })}
              detailFor={detailFor}
              onDelete={requestDeleteLocation}
            />
          );
        })}
      </Card>

      {modal && (
        <Modal
          t={t}
          open
          onClose={() => setModal(null)}
          title={`${modal.mode === 'edit' ? 'Edit' : 'Add'} ${activeTab?.singular}`}
          footer={
            <>
              <Button variant="outline" onClick={() => setModal(null)} style={{ color: t.text, borderColor: t.border }}>
                Cancel
              </Button>
              <Button onClick={saveItem}>{modal.mode === 'edit' ? 'Save' : 'Create'}</Button>
            </>
          }
        >
          {tab === 'countries' && (
            <>
              <Field t={t} label="Country Name"><Input style={inputStyle(t)} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field t={t} label="Country Code"><Input style={inputStyle(t)} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="IN, US" /></Field>
              <Field t={t} label="Phone Code"><Input style={inputStyle(t)} value={form.phone_code || ''} onChange={(e) => setForm({ ...form, phone_code: e.target.value })} placeholder="+91" /></Field>
            </>
          )}

          {tab === 'regions' && (
            <>
              <Field t={t} label="Country">
                <Select t={t} value={form.country_id || ''} onChange={(e) => setForm({ ...form, country_id: e.target.value })}>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field t={t} label="State Name"><Input style={inputStyle(t)} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field t={t} label="State Code"><Input style={inputStyle(t)} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
              <Field t={t} label="Type"><Input style={inputStyle(t)} value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="state, province" /></Field>
            </>
          )}

          {tab === 'cities' && (
            <>
              <RegionCityForm form={form} setForm={setForm} t={t} />
              <Field t={t} label="District"><Input style={inputStyle(t)} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            </>
          )}

          <Field t={t} label="Status">
            <Select t={t} value={String(form.status || 'active').toLowerCase()} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </Modal>
      )}

      <DeleteConfirm
        t={t}
        open={!!confirmDelete}
        title={confirmDelete?.title}
        text={confirmDelete?.text}
        count={confirmDelete?.items?.length || 0}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(null)}
        onConfirm={confirmPendingDelete}
      />
    </div>
  );
}

function DeleteConfirm({ t, open, title, text, count, loading, onCancel, onConfirm }) {
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverConfirm, setHoverConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setHoverCancel(false);
      setHoverConfirm(false);
    }
  }, [open]);

  if (!open) return null;
  const heading = title || `Delete ${count > 1 ? 'items' : 'item'}?`;
  const body = text || (count > 1
    ? `Permanently delete ${count} selected items. Items still in use will be skipped.`
    : 'This will permanently delete the selected item if it is not in use.');
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(14, 42, 28, 0.45)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl shadow-2xl px-7 pt-8 pb-6 text-center"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          boxShadow: '0 24px 48px rgba(14, 42, 28, 0.18)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: BRAND.dangerLight, color: BRAND.danger, boxShadow: `0 0 0 8px ${BRAND.dangerLight}` }}
        >
          <AlertTriangle size={30} strokeWidth={2.25} />
        </div>
        <div className="mb-2 font-semibold tracking-tight" style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: t.text }}>
          {heading}
        </div>
        <p className="text-sm leading-relaxed mb-7 max-w-[340px] mx-auto whitespace-pre-line" style={{ color: t.textMuted }}>
          {body}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            onMouseEnter={() => setHoverCancel(true)}
            onMouseLeave={() => setHoverCancel(false)}
            className="min-w-[118px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: hoverCancel && !loading ? t.surfaceAlt : t.surface,
              color: t.text,
              border: `1.5px solid ${hoverCancel && !loading ? BRAND.primary : t.border}`,
              boxShadow: hoverCancel && !loading ? `0 0 0 3px ${BRAND.primaryLight}` : 'none',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            onMouseEnter={() => setHoverConfirm(true)}
            onMouseLeave={() => setHoverConfirm(false)}
            className="min-w-[132px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            style={{
              background: hoverConfirm && !loading ? '#A83D35' : BRAND.danger,
              color: '#fff',
              border: 'none',
              boxShadow: hoverConfirm && !loading ? '0 8px 20px rgba(193, 72, 63, 0.35)' : '0 2px 8px rgba(0,0,0,0.12)',
              transform: hoverConfirm && !loading ? 'translateY(-1px)' : 'none',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegionCityForm({ form, setForm, t }) {
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const countryId = form.country_id || '';

  useEffect(() => {
    let cancelled = false;
    locationApi.adminListCountries({ per_page: 1000 })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res.data) ? res.data : [];
        const current = form.region?.country;
        if (current && !items.some((c) => String(c.id) === String(current.id))) {
          items.unshift(current);
        }
        setCountries(items);
      })
      .catch(() => {
        if (!cancelled) setCountries(form.region?.country ? [form.region.country] : []);
      });
    return () => { cancelled = true; };
  }, [form.region?.country]);

  useEffect(() => {
    let cancelled = false;
    if (!countryId) {
      setRegions([]);
      return undefined;
    }
    locationApi.adminListRegions({ country_id: countryId, per_page: 1000 })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res.data) ? res.data : [];
        const current = form.region;
        if (current && String(current.country_id || countryId) === String(countryId)
          && !items.some((r) => String(r.id) === String(current.id))) {
          items.unshift(current);
        }
        setRegions(items);
      })
      .catch(() => {
        if (!cancelled && form.region) setRegions([form.region]);
        else if (!cancelled) setRegions([]);
      });
    return () => { cancelled = true; };
  }, [countryId, form.region]);

  const onCountryChange = (value) => {
    setForm((prev) => ({ ...prev, country_id: value, region_id: '' }));
  };

  return (
    <>
      <Field t={t} label="Country">
        <Select t={t} value={countryId} onChange={(e) => onCountryChange(e.target.value)}>
          <option value="">Select country</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field t={t} label="State">
        <Select t={t} value={form.region_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, region_id: e.target.value }))} disabled={!countryId}>
          <option value="">{countryId ? 'Select state' : 'Select country first'}</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </Field>
    </>
  );
}
