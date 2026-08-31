import { apiFetch } from './api';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

async function parseJson(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body.message || body.error || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const categoryImportApi = {
  adminPreviewCategoryWhatsAppGroupImport(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/admin/category-whatsapp-group-imports/preview', {
      method: 'POST',
      body: formData,
    }).then(parseJson);
  },

  adminPreviewCategoryWhatsAppGroupImportStatus(token) {
    return apiFetch(`/admin/category-whatsapp-group-imports/preview/${token}`).then(parseJson);
  },

  adminConfirmCategoryWhatsAppGroupImport(importToken) {
    return apiFetch('/admin/category-whatsapp-group-imports/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ import_token: importToken }),
    }).then(parseJson);
  },

  adminCategoryWhatsAppGroupImportStatus(id) {
    return apiFetch(`/admin/category-whatsapp-group-imports/${id}/status`).then(parseJson);
  },

  adminListCategoryWhatsAppGroupImports(params = {}) {
    const query = buildQuery(params);
    return apiFetch(`/admin/category-whatsapp-group-imports${query}`).then(parseJson);
  },

  adminDeleteCategoryWhatsAppGroupImport(id) {
    return apiFetch(`/admin/category-whatsapp-group-imports/${id}`, { method: 'DELETE' }).then(parseJson);
  },

  async adminDownloadCategoryWhatsAppGroupImportTemplate() {
    const res = await apiFetch('/admin/category-whatsapp-group-imports/template');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to download template');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'HealerNet_Category_WhatsApp_Group_Import_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
