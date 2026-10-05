// Minimal Google API helper: authed fetch + OAuth2 refresh, no dependencies.
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** @returns headers with Bearer token. */
export function authHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Exchange a refresh token for a fresh access token.
 * env: { clientId, clientSecret } — returns { access_token, expires_in }.
 */
export async function refreshAccessToken(refreshToken, { clientId, clientSecret }, fetchFn = fetch) {
  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  return res.json();
}

/** GET/POST JSON against a Google API base, throwing on non-2xx. */
export async function gapi(path, accessToken, { method = 'GET', body = null, fetchFn = fetch } = {}) {
  const res = await fetchFn(path, {
    method,
    headers: { ...authHeaders(accessToken), 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`google api ${method} ${path} -> ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}
