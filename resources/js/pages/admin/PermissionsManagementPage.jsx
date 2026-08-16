import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../services/api";
import { ChevronDown, Save, ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
  RefreshButton,
  BRAND,
} from "../../components/admin/AdminShared";
import { usePermissions } from "../../hooks/usePermissions";

function TriStateCheckbox({ checked, indeterminate, disabled, onChange, className = "mt-0.5" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={className}
      disabled={disabled}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function ToolbarActionButton({ active, t, children, icon: Icon, className = "", disabled, onClick, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center font-semibold rounded-lg px-2.5 py-1.5 text-xs gap-1.5 shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
      style={active ? {
        background: BRAND.primaryLight,
        color: BRAND.primaryDark,
        border: `1px solid ${BRAND.primary}`,
      } : {
        background: t.surface,
        color: t.text,
        border: `1px solid ${t.border}`,
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

export default function PermissionsManagementPage({ t, toast }) {
  const { can } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastViewAction, setLastViewAction] = useState(null);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  const flatPermissions = useMemo(
    () => groups.flatMap((g) => (g.permissions || []).map((p) => ({ ...p, groupKey: g.key, groupLabel: g.label }))),
    [groups]
  );

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await apiFetch("/admin/roles?limit=100");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load roles");
      const list = json.data?.data || json.data || [];
      setRoles(list);
      if (!selectedRoleId && list.length > 0) {
        setSelectedRoleId(list[0].id);
      }
    } catch (err) {
      toast(err.message || "Failed to load roles", "error");
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedRoleId, toast]);

  const loadRolePermissions = useCallback(async (roleId, { preserveView = true } = {}) => {
    if (!roleId) return;
    setLoadingPerms(true);
    try {
      const res = await apiFetch(`/admin/roles/${roleId}/permissions`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load permissions");
      const nextGroups = json.data?.groups || [];
      setGroups(nextGroups);
      setSelected(new Set(json.data?.permission_slugs || []));
      if (!preserveView) {
        setExpandedGroups(new Set(nextGroups.map((g) => g.key)));
      }
    } catch (err) {
      toast(err.message || "Failed to load role permissions", "error");
    } finally {
      setLoadingPerms(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    setLastViewAction(null);
    if (selectedRoleId) loadRolePermissions(selectedRoleId, { preserveView: false });
  }, [selectedRoleId, loadRolePermissions]);

  const toggle = (slug) => {
    if (selectedRole?.is_super_admin) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const moduleSlugs = (group) => (group.permissions || []).map((p) => p.slug);

  const selectModule = (group, checked) => {
    if (selectedRole?.is_super_admin) return;
    setSelected((prev) => {
      const next = new Set(prev);
      moduleSlugs(group).forEach((slug) => (checked ? next.add(slug) : next.delete(slug)));
      return next;
    });
  };

  const selectAll = (checked) => {
    if (selectedRole?.is_super_admin) return;
    setSelected(checked ? new Set(flatPermissions.map((p) => p.slug)) : new Set());
  };

  const toggleGroupExpanded = (groupKey) => {
    setLastViewAction(null);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(groups.map((g) => g.key)));
    setLastViewAction("expand");
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
    setLastViewAction("collapse");
  };

  const handleRefresh = () => {
    loadRolePermissions(selectedRoleId, { preserveView: true });
  };

  const save = async () => {
    if (!selectedRoleId || !can("permissions.assign")) return;
    if (selectedRole?.is_super_admin) {
      toast("Super Admin permissions cannot be modified", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/admin/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permission_slugs: Array.from(selected) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Save failed");
      toast("Permissions saved successfully", "success");
      loadRolePermissions(selectedRoleId, { preserveView: true });
    } catch (err) {
      toast(err.message || "Failed to save permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  const locked = selectedRole?.is_super_admin;
  const selectedCount = selected.size;
  const totalCount = flatPermissions.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;
  const expandActive = lastViewAction === "expand";
  const collapseActive = lastViewAction === "collapse";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: t.text }}>Permissions</div>
          <div className="text-sm" style={{ color: t.textMuted }}>
            Select a role and assign module capabilities · {selectedCount}/{totalCount} selected
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can("permissions.assign") && (
            <Button size="sm" icon={Save} onClick={save} disabled={saving || loadingPerms || locked || !selectedRoleId}>
              {saving ? "Saving…" : "Save Permissions"}
            </Button>
          )}
        </div>
      </div>

      <Card t={t} className="p-5 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between w-full gap-y-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: t.textMuted }}>Select Role</span>
            <div className="w-[220px]">
              {loadingRoles ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select t={t} value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                  <option value="">Choose a role…</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}{role.is_super_admin ? " (Super Admin)" : ""}</option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          <label
            className="flex items-center gap-2.5 h-10 cursor-pointer select-none shrink-0"
            style={{ opacity: locked || loadingPerms ? 0.7 : 1 }}
          >
            <TriStateCheckbox
              checked={locked || allSelected}
              indeterminate={!locked && someSelected}
              disabled={locked || loadingPerms || totalCount === 0}
              onChange={(e) => selectAll(e.target.checked)}
            />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: t.text }}>Select all permissions</span>
          </label>

          {groups.length > 0 && (
            <ToolbarActionButton active={expandActive} t={t} onClick={expandAllGroups}>
              Expand all
            </ToolbarActionButton>
          )}

          {groups.length > 0 && (
            <ToolbarActionButton active={collapseActive} t={t} onClick={collapseAllGroups}>
              Collapse all
            </ToolbarActionButton>
          )}

          <RefreshButton t={t} refreshing={loadingPerms} onClick={handleRefresh} disabled={!selectedRoleId} />
        </div>
        {locked && (
          <p className="mt-3 text-sm text-amber-600">Super Admin always has full system access. Permissions cannot be changed.</p>
        )}
      </Card>

      {!selectedRoleId ? (
        <EmptyState t={t} icon={ShieldCheck} title="Select a role" sub="Choose a role above to manage its permissions." />
      ) : loadingPerms ? (
        <Card t={t} className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </Card>
      ) : groups.length === 0 ? (
        <EmptyState t={t} icon={ShieldCheck} title="No permissions defined" sub="Run the permission seeder to populate the catalog." />
      ) : (
        <div
          className="space-y-3 overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100vh - 260px)" }}
        >
          {groups.map((group) => {
            const slugs = moduleSlugs(group);
            const moduleSelected = slugs.filter((s) => selected.has(s)).length;
            const moduleAll = slugs.length > 0 && moduleSelected === slugs.length;
            const moduleSome = moduleSelected > 0 && moduleSelected < slugs.length;
            const expanded = expandedGroups.has(group.key);

            return (
              <Card key={group.key} t={t} className="overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroupExpanded(group.key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleGroupExpanded(group.key); }}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-b cursor-pointer hover:bg-black/[0.02]"
                  style={{ borderColor: t.border, background: t.surfaceAlt }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronDown
                      size={16}
                      className="shrink-0 transition-transform duration-200"
                      style={{
                        color: t.textMuted,
                        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textFaint }}>{group.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>{moduleSelected}/{slugs.length} selected</div>
                    </div>
                  </div>
                  <label
                    className="flex items-center gap-2 cursor-pointer select-none shrink-0"
                    style={{ opacity: locked ? 0.7 : 1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TriStateCheckbox
                      checked={locked || moduleAll}
                      indeterminate={!locked && moduleSome}
                      disabled={locked}
                      onChange={(e) => selectModule(group, e.target.checked)}
                      className=""
                    />
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: t.textMuted }}>Select all</span>
                  </label>
                </div>
                {expanded && (
                  <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {(group.permissions || []).map((perm) => (
                      <label
                        key={perm.slug}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer hover:bg-black/[0.02]"
                        style={{ borderColor: t.border, opacity: locked ? 0.7 : 1 }}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          disabled={locked}
                          checked={locked || selected.has(perm.slug)}
                          onChange={() => toggle(perm.slug)}
                        />
                        <span>
                          <span className="text-sm font-medium block" style={{ color: t.text }}>{perm.label}</span>
                          <span className="text-[11px] font-mono" style={{ color: t.textMuted }}>{perm.slug}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
