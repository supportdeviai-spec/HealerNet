import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiFetch } from "../../services/api";
import { Mail, Pencil, Send, Eye, Loader2, Plus, Trash2, MoreVertical } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  MenuItem,
  Modal,
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

const SYSTEM_SLUG_LABELS = {
  "otp-verification": "OTP Verification",
  "welcome-email": "Welcome Email",
  "password-reset": "Password Reset",
  announcement: "Platform Announcement",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function TemplateRow({ t, template, checked, onCheck, onEdit, onPreview, onTest, onDelete }) {
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
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>{template.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono" style={{ color: t.textMuted }}>{template.slug}</td>
      <td className="px-4 py-2.5 text-sm max-w-xs truncate" style={{ color: t.textMuted }}>{template.subject}</td>
      <td className="px-4 py-2.5 text-sm max-w-sm truncate" style={{ color: t.textMuted }}>{template.description || "—"}</td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={template.is_active ? "Active" : "Inactive"} /></td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}>
          <MoreVertical size={16} />
        </button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-48 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            <MenuItem t={t} icon={Pencil} label="Edit template" onClick={() => { onEdit(template); setOpen(false); }} />
            <MenuItem t={t} icon={Eye} label="Preview" onClick={() => { onPreview(template); setOpen(false); }} />
            <MenuItem t={t} icon={Send} label="Send test email" onClick={() => { onTest(template); setOpen(false); }} />
            {!template.is_system && (
              <>
                <div className="border-t" style={{ borderColor: t.border }} />
                <MenuItem t={t} icon={Trash2} label="Delete template" danger onClick={() => { onDelete(template); setOpen(false); }} />
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function EmailTemplatesPage({ t, toast }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(new Set());
  const [modalMode, setModalMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [testing, setTesting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [variablesText, setVariablesText] = useState("name, email");
  const [isActive, setIsActive] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testDraft, setTestDraft] = useState(null);

  const fetchTemplates = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/email-templates");
      const data = res.ok ? await res.json() : null;
      setTemplates(data?.status === "success" ? (data.data || []) : []);
    } catch {
      setError("Could not load email templates.");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    setSelected(new Set());
  }, [searchQuery, statusFilter]);

  const filtered = useMemo(() => {
    let list = templates;
    if (statusFilter === "Active") list = list.filter((tpl) => tpl.is_active);
    else if (statusFilter === "Inactive") list = list.filter((tpl) => !tpl.is_active);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((tpl) =>
      [tpl.name, tpl.slug, tpl.subject, tpl.description].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [templates, searchQuery, statusFilter]);

  const toggleAll = () => {
    const ids = filtered.map((tpl) => tpl.id);
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
    const deletableIds = Array.from(selected).filter((id) => {
      const tpl = templates.find((row) => row.id === id);
      return tpl && !tpl.is_system;
    });

    if (deletableIds.length === 0) {
      toast("System templates cannot be deleted. Deactivate them instead.", "error");
      return;
    }

    if (!window.confirm(`Delete ${deletableIds.length} selected template(s)? This cannot be undone.`)) return;

    let deleted = 0;
    let failed = 0;
    for (const id of deletableIds) {
      try {
        const res = await apiFetch(`/admin/email-templates/${id}`, { method: "DELETE" });
        if (res.ok) deleted++;
        else failed++;
      } catch {
        failed++;
      }
    }

    if (deleted > 0) toast(`${deleted} template(s) deleted`, "success");
    if (failed > 0) toast(`${failed} template(s) could not be deleted (system templates are protected)`, "error");
    setSelected(new Set());
    fetchTemplates({ silent: true });
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setSubject("");
    setDescription("");
    setBody("");
    setVariablesText("name, email");
    setIsActive(true);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setModalMode("create");
  };

  const openEdit = (template) => {
    setEditing(template);
    setModalMode("edit");
    setName(template.name || "");
    setSlug(template.slug || "");
    setSlugTouched(true);
    setSubject(template.subject || "");
    setDescription(template.description || "");
    setBody(template.body || "");
    setVariablesText(Array.isArray(template.variables) ? template.variables.join(", ") : "name, email");
    setIsActive(Boolean(template.is_active));
  };

  const closeFormModal = () => {
    setModalMode(null);
    setEditing(null);
  };

  const parseVariables = () =>
    variablesText
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const saveTemplate = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast("Name, subject, and body are required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        description: description.trim(),
        body,
        is_active: isActive,
      };

      let res;
      if (modalMode === "create") {
        const nextSlug = slugify(slug || name);
        if (!nextSlug) {
          toast("Enter a valid template slug", "error");
          setSaving(false);
          return;
        }
        res = await apiFetch("/admin/email-templates", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            slug: nextSlug,
            variables: parseVariables(),
          }),
        });
      } else if (editing) {
        res = await apiFetch(`/admin/email-templates/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Save failed");
      toast(modalMode === "create" ? "Template created" : "Template saved", "success");
      closeFormModal();
      fetchTemplates({ silent: true });
    } catch (err) {
      toast(err.message || "Failed to save template", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    try {
      const res = await apiFetch(`/admin/email-templates/${template.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Delete failed");
      setSelected((s) => {
        const next = new Set(s);
        next.delete(template.id);
        return next;
      });
      toast("Template deleted", "success");
      fetchTemplates({ silent: true });
    } catch (err) {
      toast(err.message || "Failed to delete template", "error");
    }
  };

  const loadPreview = async (template, overrides = {}) => {
    setPreviewLoading(true);
    try {
      const isDraft = overrides.draft;
      const payload = isDraft
        ? {
            slug: overrides.slug || template?.slug || slugify(slug || name),
            subject: overrides.subject ?? subject,
            body: overrides.body ?? body,
          }
        : {
            subject: overrides.subject,
            body: overrides.body,
          };

      const url = isDraft || !template?.id
        ? "/admin/email-templates/preview-draft"
        : `/admin/email-templates/${template.id}/preview`;

      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Preview failed");
      setPreviewSubject(data.data?.subject || payload.subject || template?.subject);
      setPreviewHtml(data.data?.html || "");
    } catch (err) {
      toast(err.message || "Failed to load preview", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreview = (template) => {
    setPreviewing(template);
    setPreviewHtml("");
    loadPreview(template);
  };

  const previewFromForm = () => {
    if (!subject.trim() || !body.trim()) {
      toast("Subject and body are required to preview", "error");
      return;
    }
    const draftTemplate = {
      id: editing?.id,
      slug: editing?.slug || slugify(slug || name),
      name: name.trim() || "Draft template",
      subject: subject.trim(),
    };
    setPreviewing(draftTemplate);
    setPreviewHtml("");
    loadPreview(draftTemplate, {
      draft: !editing?.id,
      subject: subject.trim(),
      body,
      slug: draftTemplate.slug,
    });
  };

  const openTest = (template, draft = null) => {
    setTesting(template);
    setTestDraft(draft);
    setTestRecipient("");
  };

  const openTestFromForm = () => {
    if (!editing?.id) {
      toast("Save the template first, then send a test email", "info");
      return;
    }
    openTest(editing, { subject: subject.trim(), body });
  };

  const sendTest = async () => {
    if (!testing || !testRecipient.trim()) {
      toast("Enter a test recipient email", "error");
      return;
    }
    setTestSending(true);
    try {
      const payload = { recipient: testRecipient.trim() };
      if (testDraft?.subject) payload.subject = testDraft.subject;
      if (testDraft?.body) payload.body = testDraft.body;

      const res = await apiFetch(`/admin/email-templates/${testing.id}/test-send`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Test send failed");
      toast(data.message || "Test email sent", "success");
      setTesting(null);
      setTestDraft(null);
    } catch (err) {
      toast(err.message || "Failed to send test email", "error");
    } finally {
      setTestSending(false);
    }
  };

  const variableHint = modalMode === "edit" && editing?.variables?.length
    ? editing.variables.map((v) => `{{${v}}}`).join(", ")
    : parseVariables().map((v) => `{{${v}}}`).join(", ") || "{{name}}, {{email}}";

  const handleRefresh = () => {
    setSelected(new Set());
    setSearchQuery("");
    setStatusFilter("All");
    fetchTemplates({ silent: templates.length > 0 });
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "All";

  const templatesEmptyState = useMemo(() => {
    if (!hasActiveFilters && templates.length === 0) {
      return {
        sub: 'No templates yet. Use "Create Email Template" to add a custom template, or seed the default system templates.',
        showCreate: true,
      };
    }
    if (hasActiveFilters) {
      return {
        sub: "Try clearing your search or filters to see more results, or create a new template.",
        showCreate: true,
      };
    }
    return { sub: "No records match the current view.", showCreate: false };
  }, [hasActiveFilters, templates.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: t.text }}>Email Templates</div>
          <div className="text-sm" style={{ color: t.textMuted }}>
            {templates.length} templates · Welcome, OTP, Password Reset & custom emails from the database
          </div>
        </div>
        <Button size="sm" icon={Plus} onClick={openCreate}>Create Email Template</Button>
      </div>

      <Card t={t}>
        <TableToolbar
          t={t}
          query={searchQuery}
          setQuery={setSearchQuery}
          placeholder="Search template name, slug, or subject…"
          right={
            <>
              {selected.size > 0 && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete}>
                  Delete ({selected.size})
                </Button>
              )}
              <Select t={t} className="w-auto min-w-[110px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {["All", "Active", "Inactive"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <RefreshButton t={t} refreshing={refreshing} onClick={handleRefresh} className="ml-auto" />
            </>
          }
        />

        {error && (
          <div className="p-4 text-center text-sm font-medium text-red-500">
            {error}
            <Button size="sm" variant="outline" onClick={handleRefresh} className="ml-2">Retry</Button>
          </div>
        )}

        <div className="overflow-x-auto" style={refreshTableStyle(refreshing)}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((tpl) => selected.has(tpl.id))}
                    onChange={toggleAll}
                  />
                </th>
                <Th t={t} label="Name" />
                <Th t={t} label="Slug" />
                <Th t={t} label="Subject" />
                <Th t={t} label="Description" />
                <Th t={t} label="Status" />
                <ActionsTh t={t} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                    <td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((template) => (
                  <TemplateRow
                    key={template.id}
                    t={t}
                    template={template}
                    checked={selected.has(template.id)}
                    onCheck={() => toggle(template.id)}
                    onEdit={openEdit}
                    onPreview={openPreview}
                    onTest={openTest}
                    onDelete={handleDelete}
                  />
                ))
              ) : null}
            </tbody>
          </table>

          {!loading && !refreshing && filtered.length === 0 && !error && (
            <EmptyState
              t={t}
              icon={templatesEmptyState.showCreate ? Plus : Mail}
              title="No templates found"
              sub={templatesEmptyState.sub}
              action={
                templatesEmptyState.showCreate ? (
                  <Button size="sm" icon={Plus} onClick={openCreate}>Create Email Template</Button>
                ) : null
              }
            />
          )}
        </div>
      </Card>

      <Modal
        t={t}
        open={Boolean(modalMode)}
        onClose={closeFormModal}
        title={modalMode === "create" ? "Create Email Template" : `Edit Template — ${SYSTEM_SLUG_LABELS[editing?.slug] || editing?.name || ""}`}
        footer={
          <>
            <Button variant="outline" icon={Eye} onClick={previewFromForm} disabled={!subject.trim() || !body.trim()} style={{ color: t.text, borderColor: t.border }}>Preview</Button>
            {modalMode === "edit" && (
              <Button variant="outline" icon={Send} onClick={openTestFromForm} style={{ color: t.text, borderColor: t.border }}>Test</Button>
            )}
            <Button variant="outline" onClick={closeFormModal} style={{ color: t.text, borderColor: t.border }}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={saving}>{saving ? "Saving…" : modalMode === "create" ? "Create Template" : "Save"}</Button>
          </>
        }
      >
        <div className="space-y-1">
          <Field t={t} label="Template name">
            <Input
              style={inputStyle(t)}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (modalMode === "create" && !slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          {modalMode === "create" && (
            <Field t={t} label="Slug (unique key)">
              <Input
                style={inputStyle(t)}
                value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                placeholder="newsletter-update"
              />
            </Field>
          )}
          {modalMode === "edit" && editing && (
            <Field t={t} label="Slug">
              <Input style={inputStyle(t)} value={editing.slug} disabled readOnly />
            </Field>
          )}
          <Field t={t} label="Email subject"><Input style={inputStyle(t)} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field t={t} label="Description"><Input style={inputStyle(t)} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field t={t} label="Body">
            <textarea
              style={inputStyle(t)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-y font-mono"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hello {{name}},&#10;&#10;Your message here..."
            />
          </Field>
          {modalMode === "create" && (
            <Field t={t} label="Variables (comma-separated)">
              <Input style={inputStyle(t)} value={variablesText} onChange={(e) => setVariablesText(e.target.value)} placeholder="name, email, code" />
            </Field>
          )}
          <p className="text-xs pb-2" style={{ color: t.textMuted }}>
            Available variables: {variableHint}. Plain text or HTML supported. System slugs (welcome-email, otp-verification, password-reset) are reserved.
          </p>
          <Field t={t} label="Status">
            <Select t={t} value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        t={t}
        open={Boolean(previewing)}
        onClose={() => setPreviewing(null)}
        title={previewing ? `Preview — ${previewing.name}` : "Preview"}
        width={900}
        footer={<Button variant="outline" onClick={() => setPreviewing(null)} style={{ color: t.text, borderColor: t.border }}>Close</Button>}
      >
        {previewLoading ? (
          <div className="py-12 text-center text-sm" style={{ color: t.textMuted }}><Loader2 className="inline animate-spin mr-2" size={16} />Loading preview…</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold" style={{ color: t.text }}>Subject: {previewSubject}</div>
            <div className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: t.border }}>
              <iframe title="Email preview" srcDoc={previewHtml} className="w-full min-h-[420px] border-0" sandbox="" />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        t={t}
        open={Boolean(testing)}
        onClose={() => setTesting(null)}
        title={testing ? `Send Test — ${testing.name}` : "Send Test"}
        footer={
          <>
            <Button variant="outline" onClick={() => setTesting(null)} style={{ color: t.text, borderColor: t.border }}>Cancel</Button>
            <Button icon={testSending ? Loader2 : Send} onClick={sendTest} disabled={testSending}>Send Test Email</Button>
          </>
        }
      >
        <Field t={t} label="Recipient email">
          <Input type="email" style={inputStyle(t)} value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="you@example.com" />
        </Field>
        <p className="text-xs mt-2" style={{ color: t.textMuted }}>
          Sends with sample data. Local Docker: open Mailpit at http://localhost:8025 to view the message.
        </p>
      </Modal>
    </div>
  );
}
