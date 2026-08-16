/**
 * HealerNet API Service
 * Centralized fetch wrapper with automatic Authorization header injection and 401 handling.
 */

let onUnauthorizedCallback = null;

export function registerUnauthorizedHandler(callback) {
  onUnauthorizedCallback = callback;
}

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  // Let the browser set multipart boundary for FormData — do not force JSON.
  if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.signal) {
    config.signal = options.signal;
  }

  const targetUrl = (url.startsWith('/api/') || url === '/api')
    ? url
    : `/api${url.startsWith('/') ? '' : '/'}${url}`;

  const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
  const isPublicAuthRequest = publicAuthPaths.some((path) => targetUrl.includes(path));

  try {
    const response = await fetch(targetUrl, config);

    if (response.status === 401 && token && !isPublicAuthRequest && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    return response;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
