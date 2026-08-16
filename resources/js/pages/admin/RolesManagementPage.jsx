import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../services/api";
import { Eye, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  MenuItem,
  Modal,
  Pagination,
  Select,
  Skeleton,
  StatusBadge,
  TableToolbar,
  Th,
  ActionsTh,
  RefreshButton,
  refreshTableStyle,
  inputStyle,
} from "../../components/admin/AdminShared";
import { usePermissions } from "../../hooks/usePermissions";

export default function RolesManagementPage({ t, toast }) {
  const { can } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [viewRole, setViewRole] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const refreshResetRef = useRef(false);

  const canDeleteRole = useCallback(
    (role) => can("roles.delete") && !role.is_system && !role.is_super_admin,
    [can]
  );

  const deletableOnPage = useMemo(
    () => roles.filter(canDeleteRole),
    [roles, canDeleteRole]
  );

  const fetchRoles = useCallback(async ({ silent = false, bustCache = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (query.trim()) params.set("search", query.trim());
      if (statusFilter !== "All") params.set("status", statusFilter.toLowerCase());
      if (bustCache) params.set("_", String(Date.now()));

      const res = await apiFetch(`/admin/roles?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Failed to load roles");

      const paginated = json.data;
      const items = Array.isArray(paginated) ? paginated : (paginated?.data || []);
      setRoles(items);
      setTotalPages(paginated?.last_page || 1);
      setTotal(paginated?.total ?? items.length);
    } catch (err) {
      toast(err.message || "Failed to load roles", "error");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [page, query, statusFilter, toast]);

  useEffect(() => {
    const silent = refreshResetRef.current;
    refreshResetRef.current = false;
    fetchRoles({ silent });
  }, [fetchRoles]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, query, statusFilter]);

  const toggleAll = () => {
    const ids = deletableOnPage.map((r) => r.id);
    const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)));
    setSelected(next);
  };

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} selected role(s)? This cannot be undone.`)) return;

    let deleted = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        const res = await apiFetch(`/admin/roles/${id}`, { method: "DELETE" });
        if (res.ok) deleted++;
        else failed++;
      } catch {
        failed++;
      }
    }

    if (deleted > 0) toast(`${deleted} role(s) deleted`, "success");
    if (failed > 0) {
      toast(
        `${failed} role(s) could not be deleted (system roles or roles assigned to users)`,
        "error"
      );
    }
    setSelected(new Set());
    fetchRoles({ silent: true });
  };

  const handleRefresh = () => {
    setSelected(new Set());
    const alreadyDefault = query === "" && statusFilter === "All" && page === 1;

    if (alreadyDefault) {
      fetchRoles({ silent: true, bustCache: true });
      return;
    }

    refreshResetRef.current = true;
    setQuery("");
    setStatusFilter("All");
    setPage(1);
  };

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "All";
  const canCreateRole = can("roles.create");

  const emptyState = useMemo(() => {
    if (!hasActiveFilters && total === 0) {
      return {
        sub: 'No roles exist yet. Use "Create Role" to add one, or run: php artisan db:seed --class=RolePermissionSeeder',
        showCreate: canCreateRole,
      };
    }
    if (hasActiveFilters) {
      return {
        sub: "Try clearing your search or filters to see more results, or create a new role.",
        showCreate: canCreateRole,
      };
    }
    return {
      sub: "No records match the current view.",
      showCreate: false,
    };
  }, [hasActiveFilters, total, canCreateRole]);

  const deleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/admin/roles/${role.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Delete failed");
      setSelected((s) => {
        const next = new Set(s);
        next.delete(role.id);
        return next;
      });
      toast("Role deleted", "success");
      fetchRoles({ silent: true });
    } catch (err) {
      toast(err.message || "Failed to delete role", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: t.text }}>Roles</div>
          <div className="text-sm" style={{ color: t.textMuted }}>{total} roles · assign permissions on the Permissions page</div>
        </div>
        {can("roles.create") && (
          <Button size="sm" icon={Plus} onClick={() => setModal({ mode: "create", role: null })}>Create Role</Button>
        )}
      </div>

      <Card t={t}>
        <TableToolbar
          t={t}
          query={query}
          setQuery={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search roles…"
          right={
            <>
              {selected.size > 0 && can("roles.delete") && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete}>
                  Delete ({selected.size})
                </Button>
              )}
              <Select t={t} className="w-auto min-w-[120px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                {["All", "Active", "Inactive"].map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <RefreshButton t={t} refreshing={refreshing} onClick={handleRefresh} className="ml-auto" />
            </>
          }
        />
        <div className="overflow-x-auto" style={refreshTableStyle(refreshing)}>
          <table className="w-full">
            <thead>
              <tr>
                {can("roles.delete") && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={deletableOnPage.length > 0 && deletableOnPage.every((r) => selected.has(r.id))}
                      onChange={toggleAll}
                      disabled={deletableOnPage.length === 0}
                    />
                  </th>
                )}
                <Th t={t} label="Role Name" />
                <Th t={t} label="Description" />
                <Th t={t} label="Permissions" />
                <Th t={t} label="Users" />
                <Th t={t} label="Status" />
                <Th t={t} label="Created At" />
                <ActionsTh t={t} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                    <td colSpan={can("roles.delete") ? 8 : 7} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : roles.length > 0 ? (
                roles.map((role) => (
                  <RoleRow
                    key={role.id}
                    t={t}
                    role={role}
                    showCheckboxColumn={can("roles.delete")}
                    checked={selected.has(role.id)}
                    onCheck={() => toggle(role.id)}
                    canEdit={can("roles.edit") && !role.is_super_admin}
                    canDelete={canDeleteRole(role)}
                    onView={() => setViewRole(role)}
                    onEdit={() => setModal({ mode: "edit", role })}
                    onDelete={() => deleteRole(role)}
                  />
                ))
              ) : null}
            </tbody>
          </table>
          {!loading && !refreshing && roles.length === 0 && (
            <EmptyState
              t={t}
              icon={emptyState.showCreate ? Plus : undefined}
              title="No roles found"
              sub={emptyState.sub}
              action={
                emptyState.showCreate ? (
                  <Button size="sm" icon={Plus} onClick={() => setModal({ mode: "create", role: null })}>
                    Create Role
                  </Button>
                ) : null
              }
            />
          )}
        </div>
        <Pagination t={t} page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={10} />
      </Card>

      {modal && (
        <RoleFormModal t={t} toast={toast} mode={modal.mode} role={modal.role} onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchRoles({ silent: true }); }} />
      )}

      {viewRole && (
        <Modal t={t} open onClose={() => setViewRole(null)} title={`Role: ${viewRole.name}`} footer={<Button onClick={() => setViewRole(null)}>Close</Button>}>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium" style={{ color: t.textMuted }}>Description:</span> {viewRole.description || "—"}</div>
            <div><span className="font-medium" style={{ color: t.textMuted }}>Status:</span> {viewRole.status}</div>
            <div><span className="font-medium" style={{ color: t.textMuted }}>Permissions:</span> {viewRole.permission_count ?? 0}</div>
            <div><span className="font-medium" style={{ color: t.textMuted }}>Users:</span> {viewRole.user_count ?? 0}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoleRow({ t, role, showCheckboxColumn, checked, onCheck, canEdit, canDelete, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      {showCheckboxColumn && (
        <td className="px-4 py-2.5">
          {canDelete ? (
            <input type="checkbox" checked={checked} onChange={onCheck} />
          ) : null}
        </td>
      )}
      <td className="px-4 py-2.5">
        <div className="text-sm font-medium" style={{ color: t.text }}>{role.name}</div>
        {role.is_super_admin && <div className="text-[11px] text-amber-600 font-medium">Super Admin</div>}
      </td>
      <td className="px-4 py-2.5 text-sm max-w-xs truncate" style={{ color: t.textMuted }}>{role.description || "—"}</td>
      <td className="px-4 py-2.5 text-sm tabular-nums" style={{ color: t.textMuted }}>{role.permission_count ?? 0}</td>
      <td className="px-4 py-2.5 text-sm tabular-nums" style={{ color: t.textMuted }}>{role.user_count ?? 0}</td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={role.status || "active"} /></td>
      <td className="px-4 py-2.5 text-sm font-mono" style={{ color: t.textMuted, fontSize: 12.5 }}>
        {role.created_at ? new Date(role.created_at).toISOString().slice(0, 10) : "—"}
      </td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}>
          <MoreVertical size={16} />
        </button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-48 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            <MenuItem t={t} icon={Eye} label="View role" onClick={() => { onView(); setOpen(false); }} />
            {canEdit && (
              <MenuItem t={t} icon={Pencil} label="Edit role" onClick={() => { onEdit(); setOpen(false); }} />
            )}
            {canDelete && (
              <>
                <div className="border-t" style={{ borderColor: t.border }} />
                <MenuItem t={t} icon={Trash2} label="Delete role" danger onClick={() => { onDelete(); setOpen(false); }} />
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function RoleFormModal({ t, toast, mode, role, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: role?.name || "",
    description: role?.description || "",
    status: role?.status ? role.status.charAt(0).toUpperCase() + role.status.slice(1) : "Active",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      toast("Role name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === "create" ? "/admin/roles" : `/admin/roles/${role.id}`;
      const res = await apiFetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status.toLowerCase(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Save failed");
      toast(mode === "create" ? "Role created" : "Role updated", "success");
      onSuccess();
    } catch (err) {
      toast(err.message || "Failed to save role", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      t={t}
      open
      onClose={onClose}
      title={mode === "create" ? "Create Role" : "Edit Role"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} style={{ color: t.text, borderColor: t.border }}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Save Role"}</Button>
        </>
      }
    >
      <Field t={t} label="Role Name *">
        <Input style={inputStyle(t)} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Community Manager" />
      </Field>
      <Field t={t} label="Description">
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
          style={inputStyle(t)}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What this role is responsible for"
        />
      </Field>
      <Field t={t} label="Status">
        <Select t={t} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </Field>
      <p className="text-xs mt-2" style={{ color: t.textMuted }}>Assign capabilities on the Permissions page after creating the role.</p>
    </Modal>
  );
}
