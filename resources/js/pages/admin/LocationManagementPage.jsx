import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { locationApi } from '../../services/locationApi';
import { useCountries } from '../../hooks/useCountries';
import { useRegions } from '../../hooks/useRegions';
import { useCities } from '../../hooks/useCities';
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

const LOCATION_TABS = [
  { id: 'countries', label: 'Countries', singular: 'Country' },
  { id: 'regions', label: 'States', singular: 'State' },
  { id: 'cities', label: 'Cities', singular: 'City' },
];

const GROUP_TABS = [
  { id: 'groups', label: 'Group Management', singular: 'WhatsApp Group' },
];

const PAGE_SIZE = 10;

const createTabState = () => ({ items: [], meta: {}, loaded: false });

const INITIAL_TAB_DATA = {
  countries: createTabState(),
  regions: createTabState(),
  cities: createTabState(),
  groups: createTabState(),
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
  groups: createTabUi(),
};

const selKey = (id) => String(id);

const LocationRow = memo(function LocationRow({ t, item, tab, detail, checked, onCheck, onEdit, onToggleStatus, onOpenCommunity, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isActive = (item.status || 'active').toLowerCase() === 'active';
  // Cities table: show only the primary active assigned community (not every mapped cohort)
  const whatsappCommunities = item.active_whatsapp_groups || item.activeWhatsappGroups
    || item.whatsapp_groups || item.whatsappGroups || [];
  const primaryCommunity = whatsappCommunities[0] || item.whatsapp_group || null;
  const communityName = primaryCommunity?.name || null;
  const communityId = primaryCommunity?.id || null;
  const groupUrl = item.whatsapp_url || item.whatsapp_group?.whatsapp_url || null;
  const groupName = item.name || item.whatsapp_group?.name || '—';
  const groupCommunityId = item.whatsapp_group_id || item.whatsapp_group?.id || null;
  const canDelete = tab === 'groups' && item.can_delete !== false && !(item.members_count > 0);

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>
        {tab === 'groups' && onOpenCommunity && (groupCommunityId || groupName !== '—') ? (
          <button
            type="button"
            onClick={() => onOpenCommunity({ id: groupCommunityId, name: groupName })}
            className="font-semibold hover:underline text-left"
            style={{ color: BRAND.primary }}
            title="Open in WhatsApp Communities"
          >
            {groupName}
          </button>
        ) : (
          groupName
        )}
      </td>
      {tab === 'groups' && (
        <td className="px-4 py-2.5 text-xs truncate max-w-[220px]" style={{ color: t.textMuted }}>
          {groupUrl || '-'}
        </td>
      )}
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{detail}</td>
      {tab === 'cities' && (
        <td className="px-4 py-2.5 text-sm">
          {communityName ? (
            <button
              type="button"
              onClick={() => onOpenCommunity?.({ id: communityId, name: communityName })}
              className="font-semibold hover:underline text-left"
              style={{ color: BRAND.primary }}
              title="Open in WhatsApp Communities"
            >
              {communityName}
            </button>
          ) : (
            <span style={{ color: t.textFaint }}>—</span>
          )}
        </td>
      )}
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
            {tab === 'groups' && onDelete && (
              <>
                <div className="border-t" style={{ borderColor: t.border }} />
                <MenuItem
                  t={t}
                  icon={Trash2}
                  label={canDelete ? 'Delete' : 'Delete (in use)'}
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
  onOpenCommunity,
  onDelete,
  allowCreate = true,
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
  const colSpan = tabId === 'groups' ? 6 : tabId === 'cities' ? 6 : 5;

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
                {tabId === 'groups' ? `Delete (${panelSelected.size})` : `Deactivate (${panelSelected.size})`}
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

      {(tabId === 'cities' || tabId === 'groups') && (
        <div className="px-4 pb-4 border-b relative z-10" style={{ borderColor: t.border }}>
          <LocationPicker
            variant="admin"
            t={t}
            selectStyle={inputStyle(t)}
            countryId={ui.filters.countryId}
            regionId={ui.filters.regionId}
            cityId={ui.filters.cityId}
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
              <Th t={t} label={tabId === 'groups' ? 'Group Name' : 'Name'} sortKey="name" sort={panelSort} onSort={onSort} />
              {tabId === 'groups' && <Th t={t} label="WhatsApp URL" />}
              <Th t={t} label={tabId === 'groups' ? 'Location' : 'Details'} />
              {tabId === 'cities' && <Th t={t} label="WhatsApp Community" />}
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
                  tab={tabId}
                  detail={detailFor(tabId, item)}
                  checked={panelSelected.has(selKey(item.id))}
                  onCheck={() => onToggle(item.id)}
                  onEdit={() => onEdit(item)}
                  onToggleStatus={() => onToggleStatus(item)}
                  onOpenCommunity={onOpenCommunity}
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
              ? (tabId === 'groups'
                ? 'No city–community mappings yet. Assign a WhatsApp community from Location Management → Cities.'
                : 'No location records exist yet. Use "Add" to create one, or run: php artisan db:seed --class=LocationSeeder')
              : (ui.debouncedQuery.trim() || ui.statusFilter !== 'All' || ui.filters.countryId || ui.filters.regionId || ui.filters.cityId)
                ? 'Try clearing your search or filters to see more results.'
                : 'No records match the current view.'}
            action={panelTotal === 0 && isActive && allowCreate ? (
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

export default function LocationManagementPage({ t, toast, onNav, variant = 'locations' }) {
  const isGroupsPage = variant === 'groups';
  const TABS = isGroupsPage ? GROUP_TABS : LOCATION_TABS;
  const [tab, setTab] = useState(isGroupsPage ? 'groups' : 'countries');
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([isGroupsPage ? 'groups' : 'countries']));
  const [fetchingTab, setFetchingTab] = useState(null);
  const [refreshingTab, setRefreshingTab] = useState(null);
  const [error, setError] = useState(null);
  const [tabData, setTabData] = useState(INITIAL_TAB_DATA);
  const [tabUi, setTabUi] = useState(INITIAL_TAB_UI);
  const [selectedByTab, setSelectedByTab] = useState({
    countries: new Set(),
    regions: new Set(),
    cities: new Set(),
    groups: new Set(),
  });
  const [sortByTab, setSortByTab] = useState({
    countries: { key: 'name', dir: 'asc' },
    regions: { key: 'name', dir: 'asc' },
    cities: { key: 'name', dir: 'asc' },
    groups: { key: 'name', dir: 'asc' },
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
      } else if (tabId === 'cities') {
        if (ui.filters.countryId) params.country_id = ui.filters.countryId;
        if (ui.filters.regionId) params.region_id = ui.filters.regionId;
        res = await locationApi.adminListCities(params);
      } else {
        if (ui.filters.countryId) params.country_id = ui.filters.countryId;
        if (ui.filters.regionId) params.region_id = ui.filters.regionId;
        if (ui.filters.cityId) params.city_id = ui.filters.cityId;
        res = await locationApi.adminListCommunityGroups(params);
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
    if (tabId === 'regions') return `${item.country?.name || '-'} · ${item.type || 'region'}`;
    if (tabId === 'cities') return `${item.region?.country?.name || '-'} · ${item.region?.name || '-'}`;
    return [item.city?.region?.country?.name, item.city?.region?.name, item.city?.name].filter(Boolean).join(' · ') || '—';
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
      if (tabId === 'groups') await locationApi.adminToggleCommunityGroupStatus(item.id, next);
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

  const bulkDelete = async (tabId) => {
    if (tabId === 'groups') {
      const items = tabData[tabId]?.items || [];
      const selected = selectedByTab[tabId];
      const selectedItems = items.filter((i) => selected.has(selKey(i.id)));
      if (!selectedItems.length) return;
      setConfirmDelete({ mode: 'bulk', items: selectedItems });
      return;
    }

    const items = tabData[tabId]?.items || [];
    const selected = selectedByTab[tabId];
    let updated = 0;
    for (const id of selected) {
      const item = items.find((i) => selKey(i.id) === id);
      if (!item || item.status !== 'active') continue;
      try {
        if (tabId === 'countries') await locationApi.adminToggleCountryStatus(item.id, 'inactive');
        else if (tabId === 'regions') await locationApi.adminToggleRegionStatus(item.id, 'inactive');
        else if (tabId === 'cities') await locationApi.adminToggleCityStatus(item.id, 'inactive');
        updated++;
      } catch {
        /* skip failed rows */
      }
    }
    toast?.(
      updated
        ? `${updated} marked inactive — existing user registrations are safe`
        : 'No active items selected',
      updated ? 'success' : 'error'
    );
    setSelectedForTab(tabId, new Set());
    invalidateTabCache(tabId);
    loadItemsForTab(tabId, undefined, { background: true });
  };

  const requestDeleteGroup = (item) => {
    if (item.members_count > 0 || item.can_delete === false) {
      toast?.(
        `Cannot delete: ${item.members_count || 'some'} user(s) in this city are assigned to this WhatsApp community.`,
        'error'
      );
      return;
    }
    setConfirmDelete({ mode: 'single', items: [item] });
  };

  const confirmDeleteGroups = async () => {
    if (!confirmDelete?.items?.length) return;
    setDeleting(true);
    let deleted = 0;
    let blocked = 0;
    let lastError = null;
    try {
      for (const item of confirmDelete.items) {
        try {
          await locationApi.adminDeleteCommunityGroup(item.id);
          deleted++;
        } catch (err) {
          blocked++;
          lastError = err?.message || 'Delete failed';
        }
      }
      if (deleted && !blocked) {
        toast?.(`${deleted} mapping${deleted === 1 ? '' : 's'} deleted`, 'success');
      } else if (deleted && blocked) {
        toast?.(`${deleted} deleted, ${blocked} blocked (group in use)`, 'error');
      } else {
        toast?.(lastError || 'Cannot delete groups that are in use', 'error');
      }
      setConfirmDelete(null);
      setSelectedForTab('groups', new Set());
      invalidateTabCache('groups');
      loadItemsForTab('groups', undefined, { background: true });
    } finally {
      setDeleting(false);
    }
  };

  const exportAs = (fmt) => {
    const sortedItems = getSortedItems(tab);
    const columns = [
      { key: 'name', label: tab === 'groups' ? 'Group Name' : 'Name' },
      ...(tab === 'groups' ? [{ key: 'whatsapp_url', label: 'WhatsApp URL' }] : []),
      { key: 'details', label: tab === 'groups' ? 'Location' : 'Details' },
      ...(tab === 'cities' ? [{ key: 'whatsapp_community', label: 'WhatsApp Community' }] : []),
      { key: 'status', label: 'Status' },
    ];
    const exportData = sortedItems.map((item) => {
      const communities = item.active_whatsapp_groups || item.activeWhatsappGroups
        || item.whatsapp_groups || item.whatsappGroups || [];
      const primary = communities[0] || item.whatsapp_group || null;
      return {
        name: item.name || item.whatsapp_group?.name || '-',
        details: detailFor(tab, item),
        whatsapp_community: primary?.name || '-',
        whatsapp_url: item.whatsapp_url || item.whatsapp_group?.whatsapp_url || primary?.whatsapp_url || '-',
        status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Active',
      };
    });
    const filename = `HealerNet_${isGroupsPage ? 'Group_Management' : `Locations_${activeTab?.label.replace(/\s+/g, '_') || tab}`}`;
    if (fmt === 'CSV') exportToCSV(filename, exportData, columns, toast);
    else exportToExcel(filename, exportData, columns, toast);
  };

  const openCreate = () => {
    if (isGroupsPage || tab === 'groups') {
      toast?.('Assign WhatsApp communities from Location Management → Cities.', 'error');
      return;
    }
    const filters = currentUi.filters;
    if (tab === 'countries') setForm({ name: '', code: '', phone_code: '', status: 'active' });
    if (tab === 'regions') setForm({ country_id: filters.countryId || '', name: '', code: '', type: 'state', status: 'active' });
    if (tab === 'cities') setForm({
      region_id: filters.regionId || '',
      name: '',
      status: 'active',
      country_id: filters.countryId || '',
      whatsapp_group_id: '',
      whatsapp_url: '',
    });
    if (tab === 'groups') {
      setForm({
        city_id: filters.cityId || '',
        whatsapp_group_id: '',
        whatsapp_url: '',
        status: 'active',
        country_id: filters.countryId || '',
        region_id: filters.regionId || '',
      });
    }
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => {
    const filters = currentUi.filters;
    const linkedGroup = (item.active_whatsapp_groups || item.activeWhatsappGroups || item.whatsapp_groups || item.whatsappGroups || [])[0]
      || item.whatsapp_group
      || null;
    setForm({
      ...item,
      whatsapp_group_id: item.whatsapp_group_id || linkedGroup?.id || item.whatsapp_group?.id || '',
      whatsapp_url: item.whatsapp_url || linkedGroup?.whatsapp_url || item.whatsapp_group?.whatsapp_url || '',
      country_id: item.region?.country?.id ?? item.city?.region?.country?.id ?? item.country_id ?? filters.countryId ?? '',
      region_id: item.region_id ?? item.region?.id ?? item.city?.region?.id ?? filters.regionId ?? '',
      city_id: item.city_id || item.city?.id || filters.cityId,
    });
    setModal({ mode: 'edit', id: item.id });
  };

  const saveItem = async () => {
    try {
      if (tab === 'groups') {
        if (!form.city_id || !form.whatsapp_group_id) {
          toast?.('Select a city and WhatsApp group', 'error');
          return;
        }
      }
      if (tab === 'countries') await locationApi.adminSaveCountry(form, modal.mode === 'edit' ? modal.id : null);
      if (tab === 'regions') await locationApi.adminSaveRegion(form, modal.mode === 'edit' ? modal.id : null);
      if (tab === 'cities') {
        const cityRes = await locationApi.adminSaveCity(
          {
            region_id: form.region_id,
            name: form.name,
            status: form.status || 'active',
            whatsapp_group_id: form.whatsapp_group_id || null,
          },
          modal.mode === 'edit' ? modal.id : null
        );
        void cityRes;
      }
      if (tab === 'groups') {
        const payload = {
          city_id: Number(form.city_id),
          whatsapp_group_id: form.whatsapp_group_id,
          status: form.status || 'active',
        };
        await locationApi.adminSaveCommunityGroup(payload, modal.mode === 'edit' ? modal.id : null);
      }
      toast?.('Saved successfully', 'success');
      setModal(null);
      invalidateTabCache(tab);
      if (tab === 'cities' && form.whatsapp_group_id) {
        invalidateTabCache('groups');
      }
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
            {isGroupsPage ? 'Group Management' : 'Location Management'}
          </div>
          <div className="text-sm" style={{ color: t.textMuted }}>
            {Number(total || 0).toLocaleString()} {isGroupsPage ? 'groups' : (activeTab?.label.toLowerCase() || 'items')} in database
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs('CSV')} style={{ color: t.text, borderColor: t.border }}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs('Excel')} style={{ color: t.text, borderColor: t.border }}>Excel</Button>
          {!isGroupsPage && (
            <Button size="sm" icon={Plus} onClick={openCreate}>
              Add {activeTab?.singular || 'Item'}
            </Button>
          )}
        </div>
      </div>

      {!isGroupsPage && (
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
      )}

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
              allowCreate={!isGroupsPage}
              onDelete={tabId === 'groups' ? requestDeleteGroup : undefined}
              onOpenCommunity={(community) => {
                if (!onNav) return;
                onNav('communities', {
                  search: community?.name || '',
                  id: community?.id || null,
                });
              }}
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
              <Field t={t} label="City Name"><Input style={inputStyle(t)} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <CityWhatsAppCommunityFields form={form} setForm={setForm} t={t} />
            </>
          )}

          {tab === 'groups' && (
            <>
              <CommunityGroupMappingForm
                form={form}
                setForm={setForm}
                t={t}
                excludeMappingId={modal.mode === 'edit' ? modal.id : null}
              />
              <Field t={t} label="WhatsApp URL">
                <Input
                  style={{ ...inputStyle(t), opacity: 0.85 }}
                  value={form.whatsapp_url || ''}
                  readOnly
                  placeholder="Select a community group to auto-fill"
                />
              </Field>
            </>
          )}

          <Field t={t} label="Status">
            <Select t={t} value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </Modal>
      )}

      <GroupDeleteConfirm
        t={t}
        open={!!confirmDelete}
        count={confirmDelete?.items?.length || 0}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(null)}
        onConfirm={confirmDeleteGroups}
      />
    </div>
  );
}

function GroupDeleteConfirm({ t, open, count, loading, onCancel, onConfirm }) {
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverConfirm, setHoverConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setHoverCancel(false);
      setHoverConfirm(false);
    }
  }, [open]);

  if (!open) return null;
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
          Delete group mapping{count > 1 ? 's' : ''}?
        </div>
        <p className="text-sm leading-relaxed mb-7 max-w-[340px] mx-auto" style={{ color: t.textMuted }}>
          {count > 1
            ? `Remove ${count} city–community mappings. Mappings with assigned users will be blocked.`
            : 'This removes the city–community mapping. Blocked if any users in this city are assigned to the community.'}
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
  const { countries } = useCountries();
  const [countryId, setCountryId] = useState(form.country_id || '');
  const { regions } = useRegions(countryId);

  useEffect(() => {
    setCountryId(form.country_id || '');
  }, [form.country_id]);

  const onCountryChange = (value) => {
    setCountryId(value);
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

function CityWhatsAppCommunityFields({ form, setForm, t }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    locationApi.adminListWhatsAppGroups({ all: true, status: 'active' })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setGroups(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setGroups([]);
          setError(err?.message || 'Failed to load WhatsApp communities');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const onGroupChange = (value) => {
    const selected = groups.find((g) => String(g.id) === String(value));
    setForm((prev) => ({
      ...prev,
      whatsapp_group_id: value,
      whatsapp_url: selected?.whatsapp_url || '',
    }));
  };

  return (
    <>
      <Field t={t} label="WhatsApp Community" hint="Optional. Links this city to a WhatsApp community group.">
        <Select
          t={t}
          value={form.whatsapp_group_id || ''}
          onChange={(e) => onGroupChange(e.target.value)}
          disabled={loading}
        >
          <option value="">
            {loading ? 'Loading communities…' : 'Select WhatsApp community (optional)'}
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {!loading && !error && groups.length === 0 && (
          <p className="mt-1 text-xs" style={{ color: t.textMuted }}>
            No active WhatsApp groups yet. Create one under WhatsApp Communities first.
          </p>
        )}
      </Field>

      {form.whatsapp_group_id && (
        <Field t={t} label="WhatsApp Link">
          <Input
            style={{ ...inputStyle(t), opacity: 0.9 }}
            value={form.whatsapp_url || ''}
            readOnly
            placeholder="WhatsApp invite link appears here"
          />
          {form.whatsapp_url ? (
            <a
              href={form.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-xs font-semibold hover:underline"
              style={{ color: BRAND.primary }}
            >
              Open invite link
            </a>
          ) : (
            <p className="mt-1 text-xs" style={{ color: t.textMuted }}>
              No invite link set for this group.
            </p>
          )}
        </Field>
      )}
    </>
  );
}

function CommunityGroupMappingForm({ form, setForm, t, excludeMappingId }) {
  const { countries } = useCountries();
  const [countryId, setCountryId] = useState(form.country_id || '');
  const [regionId, setRegionId] = useState(form.region_id || '');
  const { regions, loading: loadingRegions } = useRegions(countryId);
  const { cities, loading: loadingCities } = useCities(regionId);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(null);

  useEffect(() => {
    setCountryId(form.country_id || '');
    setRegionId(form.region_id || '');
  }, [form.country_id, form.region_id]);

  useEffect(() => {
    if (!form.city_id) {
      setGroupOptions([]);
      setGroupsError(null);
      return;
    }

    let cancelled = false;
    setLoadingGroups(true);
    setGroupsError(null);
    locationApi.adminAvailableWhatsAppGroups(form.city_id, excludeMappingId)
      .then((res) => {
        if (cancelled) return;
        setGroupOptions(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setGroupOptions([]);
          setGroupsError(err?.message || 'Failed to load WhatsApp groups');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false);
      });

    return () => { cancelled = true; };
  }, [form.city_id, excludeMappingId]);

  const onCountryChange = (value) => {
    setCountryId(value);
    setRegionId('');
    setForm((prev) => ({
      ...prev,
      country_id: value,
      region_id: '',
      city_id: '',
      whatsapp_group_id: '',
      whatsapp_url: '',
    }));
  };

  const onRegionChange = (value) => {
    setRegionId(value);
    setForm((prev) => ({
      ...prev,
      region_id: value,
      city_id: '',
      whatsapp_group_id: '',
      whatsapp_url: '',
    }));
  };

  const onCityChange = (value) => {
    setForm((prev) => ({
      ...prev,
      city_id: value,
      whatsapp_group_id: '',
      whatsapp_url: '',
    }));
  };

  const onGroupChange = (value) => {
    const selected = groupOptions.find((g) => String(g.id) === String(value));
    setForm((prev) => ({
      ...prev,
      whatsapp_group_id: value,
      whatsapp_url: selected?.whatsapp_url || '',
    }));
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
        <Select t={t} value={regionId} onChange={(e) => onRegionChange(e.target.value)} disabled={!countryId || loadingRegions}>
          <option value="">{loadingRegions ? 'Loading states…' : 'Select state'}</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </Field>
      <Field t={t} label="City">
        <Select t={t} value={form.city_id || ''} onChange={(e) => onCityChange(e.target.value)} disabled={!regionId || loadingCities}>
          <option value="">{loadingCities ? 'Loading cities…' : 'Select city'}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field t={t} label="WhatsApp Group">
        <Select
          t={t}
          value={form.whatsapp_group_id || ''}
          onChange={(e) => onGroupChange(e.target.value)}
          disabled={!form.city_id || loadingGroups}
        >
          <option value="">
            {!form.city_id ? 'Select a city first' : loadingGroups ? 'Loading groups…' : 'Select WhatsApp group'}
          </option>
          {groupOptions.map((g) => (
            <option
              key={g.id}
              value={g.id}
              disabled={!g.selectable && String(g.id) !== String(form.whatsapp_group_id)}
            >
              {g.name}{g.already_assigned && String(g.id) !== String(form.whatsapp_group_id) ? ' (Already Assigned)' : ''}
            </option>
          ))}
        </Select>
        {groupsError && (
          <p className="mt-1 text-xs text-red-500">{groupsError}</p>
        )}
        {form.city_id && !loadingGroups && !groupsError && groupOptions.length === 0 && (
          <p className="mt-1 text-xs" style={{ color: t.textMuted }}>
            No WhatsApp groups available. Create one under WhatsApp Communities first.
          </p>
        )}
        {form.city_id && !loadingGroups && groupOptions.length > 0 && !groupOptions.some((g) => g.selectable || String(g.id) === String(form.whatsapp_group_id)) && (
          <p className="mt-1 text-xs" style={{ color: t.textMuted }}>
            All active WhatsApp groups are already assigned to this city.
          </p>
        )}
      </Field>
    </>
  );
}

function GroupCityForm({ form, setForm, t }) {
  const { countries } = useCountries();
  const [countryId, setCountryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const { regions } = useRegions(countryId);
  const { cities } = useCities(regionId);

  return (
    <>
      <Field t={t} label="Country">
        <Select t={t} value={countryId} onChange={(e) => { setCountryId(e.target.value); setRegionId(''); }}>
          <option value="">Select country</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field t={t} label="State">
        <Select t={t} value={regionId} onChange={(e) => setRegionId(e.target.value)}>
          <option value="">Select state</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </Field>
      <Field t={t} label="City">
        <Select t={t} value={form.city_id || ''} onChange={(e) => setForm({ ...form, city_id: e.target.value })}>
          <option value="">Select city</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
    </>
  );
}
