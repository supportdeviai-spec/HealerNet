import { apiFetch } from './api';

function buildQuery(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(clean).map(([key, value]) => [key, String(value)])
    )
  ).toString();
  return query ? `?${query}` : '';
}

async function parseJson(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      body.message ||
      (body.errors ? Object.values(body.errors).flat().join(', ') : null) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const locationApi = {
  getCategories() {
    return apiFetch('/categories').then(parseJson);
  },

  getCountries(search = '') {
    return apiFetch(`/countries${buildQuery({ search: search || undefined })}`).then(parseJson);
  },

  getRegions(countryId, search = '') {
    return apiFetch(`/countries/${countryId}/regions${buildQuery({ search: search || undefined })}`).then(parseJson);
  },

  getCities(regionId, search = '') {
    return apiFetch(`/regions/${regionId}/cities${buildQuery({ search: search || undefined })}`).then(parseJson);
  },

  getCommunityGroups(cityId) {
    return apiFetch(`/cities/${cityId}/community-groups`).then(parseJson);
  },

  // Admin endpoints
  adminListCountries(params = {}) {
    return apiFetch(`/admin/countries${buildQuery(params)}`).then(parseJson);
  },

  adminSaveCountry(data, id = null) {
    return apiFetch(id ? `/admin/countries/${id}` : '/admin/countries', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(parseJson);
  },

  adminToggleCountryStatus(id, status) {
    return apiFetch(`/admin/countries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(parseJson);
  },

  adminListRegions(params = {}) {
    return apiFetch(`/admin/regions${buildQuery(params)}`).then(parseJson);
  },

  adminSaveRegion(data, id = null) {
    return apiFetch(id ? `/admin/regions/${id}` : '/admin/regions', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(parseJson);
  },

  adminToggleRegionStatus(id, status) {
    return apiFetch(`/admin/regions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(parseJson);
  },

  adminListCities(params = {}) {
    return apiFetch(`/admin/cities${buildQuery(params)}`).then(parseJson);
  },

  adminSaveCity(data, id = null) {
    return apiFetch(id ? `/admin/cities/${id}` : '/admin/cities', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(parseJson);
  },

  adminToggleCityStatus(id, status) {
    return apiFetch(`/admin/cities/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(parseJson);
  },

  adminListCommunityGroups(params = {}) {
    return apiFetch(`/admin/community-groups${buildQuery(params)}`).then(parseJson);
  },

  adminSaveCommunityGroup(data, id = null) {
    return apiFetch(id ? `/admin/community-groups/${id}` : '/admin/community-groups', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(parseJson);
  },

  adminToggleCommunityGroupStatus(id, status) {
    return apiFetch(`/admin/community-groups/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(parseJson);
  },

  adminDeleteCommunityGroup(id) {
    return apiFetch(`/admin/community-groups/${id}`, { method: 'DELETE' }).then(parseJson);
  },

  adminAvailableWhatsAppGroups(cityId, excludeMappingId = null) {
    return apiFetch(`/admin/cities/${cityId}/available-whatsapp-groups${buildQuery({
      exclude_mapping_id: excludeMappingId || undefined,
    })}`).then(parseJson);
  },

  adminListWhatsAppGroups(params = {}) {
    return apiFetch(`/admin/whatsapp-groups${buildQuery(params)}`).then(parseJson);
  },

  adminGetWhatsAppGroup(id) {
    return apiFetch(`/admin/whatsapp-groups/${id}`).then(parseJson);
  },

  adminSaveWhatsAppGroup(data, id = null) {
    return apiFetch(id ? `/admin/whatsapp-groups/${id}` : '/admin/whatsapp-groups', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(parseJson);
  },

  adminDeleteWhatsAppGroup(id) {
    return apiFetch(`/admin/whatsapp-groups/${id}`, { method: 'DELETE' }).then(parseJson);
  },

  adminPreviewWhatsAppCommunityImport(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/admin/whatsapp-community-imports/preview', {
      method: 'POST',
      body: formData,
    }).then(parseJson);
  },

  adminConfirmWhatsAppCommunityImport(importToken) {
    return apiFetch('/admin/whatsapp-community-imports/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ import_token: importToken }),
    }).then(parseJson);
  },

  adminListWhatsAppCommunityImports() {
    return apiFetch('/admin/whatsapp-community-imports').then(parseJson);
  },

  async adminDownloadWhatsAppImportTemplate() {
    const res = await apiFetch('/admin/whatsapp-community-imports/template');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to download template');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'HealerNet_WhatsApp_Community_Import_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
