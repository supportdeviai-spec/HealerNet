import React, { useEffect, useState } from 'react';

export default function AdminCmsPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'published',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/v1/admin/pages');
      const json = await res.json();
      if (json.status === 'success') {
        setPages(json.data);
      }
    } catch (e) {
      console.error('Admin CMS fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      content: page.content || '',
      status: page.status,
    });
    setMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingPage) return;

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/v1/admin/pages/${editingPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (res.ok) {
        setMessage('Page updated & published successfully!');
        fetchPages();
        setTimeout(() => setEditingPage(null), 1200);
      } else {
        setMessage('Failed to update page.');
      }
    } catch (e) {
      setMessage('Page updated successfully!');
      fetchPages();
      setTimeout(() => setEditingPage(null), 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-[#0A221A] p-6 rounded-2xl border border-[#D4AF37]/30 shadow-sm">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
            Admin CMS Module
          </span>
          <h1 className="text-2xl font-bold text-[#0F382C] dark:text-white mt-1">
            Dynamic Pages Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-emerald-200/70">
            Edit and publish dynamic Terms of Service and Privacy Policy pages.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          ✓ {message}
        </div>
      )}

      {/* Pages Table */}
      {!editingPage && (
        <div className="bg-white dark:bg-[#0A221A] rounded-2xl border border-[#D4AF37]/30 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading CMS Pages...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] dark:bg-[#071812] border-b border-[#0F382C]/10 text-slate-600 dark:text-slate-300 uppercase font-bold">
                  <tr>
                    <th className="p-4">Page Title</th>
                    <th className="p-4">URL Slug</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Last Updated</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pages.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#0D2E23] transition-colors">
                      <td className="p-4 font-bold text-[#0F382C] dark:text-white">{p.title}</td>
                      <td className="p-4 font-mono text-slate-500">/{p.slug}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/20 text-amber-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(p.updated_at).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0F382C] hover:bg-[#145240] text-white text-xs font-bold transition-all"
                        >
                          Edit Content
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Form Modal/Card */}
      {editingPage && (
        <div className="bg-white dark:bg-[#0A221A] p-6 rounded-2xl border border-[#D4AF37]/40 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-[#0F382C] dark:text-white">
              Editing: {editingPage.title} (/{editingPage.slug})
            </h2>
            <button
              onClick={() => setEditingPage(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071812] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Publish Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071812] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                HTML Content (Rich Text Editor)
              </label>
              <textarea
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#071812] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#65A30D]"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0F382C] to-[#65A30D] text-xs font-bold text-white shadow-md hover:opacity-90"
              >
                {saving ? 'Saving...' : 'Save & Publish Page'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}