import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "../../services/api";
import { Plus, Pencil, Trash2, ImageIcon, Eye, Upload, Loader2, Download, MoreVertical, UserX, UserCheck,
} from "lucide-react";
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
  exportToCSV,
  exportToExcel,
  inputStyle,
} from "../../components/admin/AdminShared";
import { BANNER_PAGE_LABELS, BANNER_PAGE_OPTIONS, BANNER_RECOMMENDED_SIZES, bannerSizeLabel, bannerSizeParts, resolveBannerSrc } from "../../constants/bannerPages";

const PAGE_SIZE = 10;

function BannerRow({ t, b, checked, onCheck, onEdit, onDelete, onToggleStatus, onPreview }) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const ref = useRef(null);
  const src = resolveBannerSrc(b);

  useEffect(() => {
    setImgFailed(false);
  }, [src, b.id, b.updated_at]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5">
        <div className="w-24 h-14 rounded-lg overflow-hidden border flex items-center justify-center" style={{ borderColor: t.border, background: t.surfaceAlt }}>
          {!imgFailed && src ? (
            <img
              key={`${b.id}-${src}`}
              src={src}
              alt={b.title || "Banner"}
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="text-[10px] px-1 text-center" style={{ color: t.textMuted }}>No preview</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-sm capitalize" style={{ color: t.textMuted }}>{BANNER_PAGE_LABELS[b.page] || b.page}</td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>{b.title || "-"}</td>
      <td className="px-4 py-2.5 text-sm max-w-xs truncate" style={{ color: t.textMuted }}>{b.description || "-"}</td>
      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: t.textMuted }}>
        <span className="font-medium" style={{ color: t.text }} title="Recommended upload size">
          {bannerSizeParts(b).required || "—"}
        </span>
      </td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={b.is_active ? "Active" : "Inactive"} /></td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}><MoreVertical size={16} /></button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-48 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            {b.image_url && <MenuItem t={t} icon={Eye} label="Preview image" onClick={() => { onPreview(); setOpen(false); }} />}
            <MenuItem t={t} icon={Pencil} label="Edit banner" onClick={() => { onEdit(); setOpen(false); }} />
            {b.is_active
              ? <MenuItem t={t} icon={UserX} label="Inactive" onClick={() => { onToggleStatus(); setOpen(false); }} />
              : <MenuItem t={t} icon={UserCheck} label="Activate" onClick={() => { onToggleStatus(); setOpen(false); }} />}
            <div className="border-t" style={{ borderColor: t.border }} />
            <MenuItem t={t} icon={Trash2} label="Delete banner" danger onClick={() => { onDelete(); setOpen(false); }} />
          </div>
        )}
      </td>
    </tr>
  );
}

export default function BannersPage({ t, toast }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [pageFilter, setPageFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [listPage, setListPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetPage, setTargetPage] = useState("login");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  const fetchBanners = useCallback(async ({ silent = false, bustCache = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = bustCache ? `/admin/banners?_=${Date.now()}` : "/admin/banners";
      const res = await apiFetch(url);
      const data = res.ok ? await res.json() : null;
      if (data && (data.status === "success" || data.success)) {
        setBanners(data.data || []);
      } else {
        setBanners([]);
      }
    } catch {
      setError("Could not load banners from backend API.");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setTitle("");
    setDescription("");
    setTargetPage("login");
    setIsActive(true);
    setImageFile(null);
    setImagePreview("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setTitle(banner.title || "");
    setDescription(banner.description || "");
    setTargetPage(banner.page || "login");
    setIsActive(Boolean(banner.is_active));
    setImageFile(null);
    setImagePreview(resolveBannerSrc(banner) || "");
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("page", targetPage);
      formData.append("is_active", isActive ? "1" : "0");
      if (imageFile) formData.append("image", imageFile);

      const url = editingBanner ? `/admin/banners/${editingBanner.id}` : "/admin/banners";
      const res = await apiFetch(url, { method: "POST", body: formData });
      const payload = await res.json().catch(() => null);
      if (!res.ok || (payload && payload.status === "error")) {
        const msg = payload?.message || payload?.errors?.image?.[0] || "Save failed";
        throw new Error(msg);
      }

      const saved = payload?.data;
      if (saved?.id) {
        setBanners((prev) => {
          const idx = prev.findIndex((row) => row.id === saved.id);
          if (idx === -1) return [saved, ...prev];
          const next = [...prev];
          next[idx] = { ...prev[idx], ...saved };
          return next;
        });
      }

      toast(editingBanner ? "Banner updated" : "Banner created", "success");
      setIsModalOpen(false);
      setImageFile(null);
      setImagePreview("");
      await fetchBanners({ silent: true, bustCache: true });
    } catch (err) {
      toast(err?.message || "Failed to save banner", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/admin/banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      toast("Banner deleted", "success");
      fetchBanners();
    } catch {
      toast("Failed to delete banner", "error");
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      const res = await apiFetch(`/admin/banners/${banner.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      fetchBanners();
    } catch {
      toast("Error toggling status", "error");
    }
  };

  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchesPage = pageFilter === "All" || b.page === pageFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = !q ||
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q));
      return matchesPage && matchesQuery;
    });
  }, [banners, pageFilter, searchQuery]);

  useEffect(() => setListPage(1), [searchQuery, pageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBanners.length / PAGE_SIZE));
  const pageRows = filteredBanners.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

  const handleRefresh = () => {
    setSelected(new Set());
    const alreadyDefault = searchQuery === "" && pageFilter === "All" && listPage === 1;
    if (!alreadyDefault) {
      setSearchQuery("");
      setPageFilter("All");
      setListPage(1);
    }
    fetchBanners({ silent: banners.length > 0, bustCache: true });
  };

  const hasActiveFilters = searchQuery.trim() !== "" || pageFilter !== "All";
  const emptyState = useMemo(() => {
    if (!hasActiveFilters && banners.length === 0) {
      return {
        sub: 'No banners yet. Use "Add Banner" to upload images for login and registration pages.',
        showCreate: true,
      };
    }
    if (hasActiveFilters) {
      return {
        sub: "Try clearing your search or filters to see more results, or add a new banner.",
        showCreate: true,
      };
    }
    return { sub: "No records match the current view.", showCreate: false };
  }, [hasActiveFilters, banners.length]);

  const toggleAll = () => {
    const ids = pageRows.map((r) => r.id);
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
    let deleted = 0;
    for (const id of selected) {
      try {
        const res = await apiFetch(`/admin/banners/${id}`, { method: "DELETE" });
        if (res.ok) deleted++;
      } catch {
        /* skip */
      }
    }
    toast(deleted ? `${deleted} banners deleted` : "Could not delete selected banners", deleted ? "success" : "error");
    setSelected(new Set());
    fetchBanners();
  };

  const exportAs = (fmt) => {
    const columns = [
      { key: "page", label: "Target Page" },
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "size", label: "Size" },
      { key: "status", label: "Status" },
    ];
    const exportData = filteredBanners.map((b) => ({
      page: b.page,
      title: b.title || "-",
      description: b.description || "-",
      size: bannerSizeLabel(b),
      status: b.is_active ? "Active" : "Inactive",
    }));
    if (fmt === "CSV") exportToCSV("HealerNet_Banners", exportData, columns, toast);
    else exportToExcel("HealerNet_Banners", exportData, columns, toast);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: t.text }}>Banner Management</div>
          <div className="text-sm" style={{ color: t.textMuted }}>{banners.length} banners across auth & success pages</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("CSV")} style={{ color: t.text, borderColor: t.border }}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("Excel")} style={{ color: t.text, borderColor: t.border }}>Excel</Button>
          <Button size="sm" icon={Plus} onClick={handleOpenCreate}>Add Banner</Button>
        </div>
      </div>

      <Card t={t}>
        <TableToolbar
          t={t}
          query={searchQuery}
          setQuery={setSearchQuery}
          placeholder="Search title or description…"
          right={
            <>
              {selected.size > 0 && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete}>Delete ({selected.size})</Button>
              )}
              <Select t={t} className="w-auto min-w-[180px]" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}>
                <option value="All">All Pages</option>
                {BANNER_PAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <RefreshButton t={t} refreshing={refreshing} onClick={handleRefresh} className="ml-auto" />
            </>
          }
        />

        {error && (
          <div className="p-4 text-center text-sm font-medium text-red-500 flex items-center justify-center gap-2">
            {error}
            <Button size="sm" variant="outline" onClick={fetchBanners} className="ml-2">Retry</Button>
          </div>
        )}

        <div className="overflow-x-auto" style={refreshTableStyle(refreshing)}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleAll}
                  />
                </th>
                <Th t={t} label="Preview" />
                <Th t={t} label="Target Page" />
                <Th t={t} label="Title" />
                <Th t={t} label="Description" />
                <Th t={t} label="Size" />
                <Th t={t} label="Status" />
                <ActionsTh t={t} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                    <td colSpan={8} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : pageRows.length > 0 ? (
                pageRows.map((b) => (
                  <BannerRow
                    key={b.id}
                    t={t}
                    b={b}
                    checked={selected.has(b.id)}
                    onCheck={() => toggle(b.id)}
                    onEdit={() => handleOpenEdit(b)}
                    onDelete={() => handleDelete(b.id)}
                    onToggleStatus={() => handleToggleStatus(b)}
                    onPreview={() => window.open(resolveBannerSrc(b), "_blank")}
                  />
                ))
              ) : null}
            </tbody>
          </table>

          {!loading && !refreshing && pageRows.length === 0 && !error && (
            <EmptyState
              t={t}
              icon={emptyState.showCreate ? Plus : ImageIcon}
              title="No banners found"
              sub={emptyState.sub}
              action={
                emptyState.showCreate ? (
                  <Button size="sm" icon={Plus} onClick={handleOpenCreate}>Add Banner</Button>
                ) : null
              }
            />
          )}
        </div>

        <Pagination t={t} page={listPage} totalPages={totalPages} onPage={setListPage} total={filteredBanners.length} pageSize={PAGE_SIZE} />
      </Card>

      <Modal
        t={t}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? "Edit Banner" : "Add Banner"}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} style={{ color: t.text, borderColor: t.border }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : editingBanner ? "Save Changes" : "Create Banner"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-1">
          <Field t={t} label="Target Page">
            <Select t={t} value={targetPage} onChange={(e) => setTargetPage(e.target.value)} required>
              {BANNER_PAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            {targetPage === 'logo' && (
              <p className="text-xs mt-1.5" style={{ color: t.textMuted }}>
                Upload a square PNG logo. It appears on login, registration, reset password, and thank-you pages.
              </p>
            )}
            <p className="text-xs mt-1.5" style={{ color: t.textMuted }}>
              Required size: {(BANNER_RECOMMENDED_SIZES[targetPage] || '1080 × 1440')} px (width × height)
            </p>
          </Field>

          <Field t={t} label={`Banner Image${editingBanner ? " (optional)" : ""}`}>
            <input type="file" ref={fileInputRef} accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-lg p-4 text-center"
              style={{ borderColor: t.border, background: t.surfaceAlt }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="mx-auto max-h-32 rounded-lg object-cover" />
              ) : (
                <span className="text-sm flex items-center justify-center gap-2" style={{ color: t.textMuted }}>
                  <Upload size={16} /> Click to select image
                </span>
              )}
            </button>
          </Field>

          <Field t={t} label="Title"><Input style={inputStyle(t)} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field t={t} label="Description"><textarea style={inputStyle(t)} className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field t={t} label="Status">
            <Select t={t} value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
