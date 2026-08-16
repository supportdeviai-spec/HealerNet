const POST_LOGIN_REDIRECT_KEY = 'healernet_post_login_redirect';

export function savePostLoginRedirect(view) {
  if (view && view !== 'admin-login') {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, view);
  }
}

export function consumePostLoginRedirect(fallback = 'admin-dashboard') {
  const redirect = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) || fallback;
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return redirect;
}

export function clearPostLoginRedirect() {
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
}

export function getUserRoleSlug(user) {
  if (!user) return 'user';
  return user.role?.slug || (typeof user.role === 'string' ? user.role : 'user');
}

export function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function persistAuth(user, token) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearPostLoginRedirect();
}
