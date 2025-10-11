// simple fetch wrapper that attaches firebase id token
import { auth } from '@/utils/lib/firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const DEV_X_UID = process.env.NEXT_PUBLIC_DEV_X_UID;

async function getIdToken(): Promise<string | null> {
  console.log('[apiClient] auth:', !!auth);
  console.log('[apiClient] currentUser:', !!auth?.currentUser);
  if (!auth?.currentUser) {
    console.warn('[apiClient] No currentUser - user not signed in');
    return null;
  }
  const token = await auth.currentUser.getIdToken();
  console.log('[apiClient] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');
  return token;
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  // attach auth
  let token = await getIdToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
    console.log('[apiClient] Added Bearer token to request');
  } else if (DEV_X_UID) {
    headers.set('x-uid', DEV_X_UID);
    console.log('[apiClient] Added x-uid to request:', DEV_X_UID);
  } else {
    console.warn('[apiClient] No token or x-uid available - request will fail');
  }

  const doFetch = async () => fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });

  console.log('[apiClient] Fetching:', `${API_BASE}${path}`);
  let res = await doFetch();
  console.log('[apiClient] Response status:', res.status);

  // retry once on 401 with forced refresh
  if (res.status === 401 && auth?.currentUser) {
    try {
      console.log('[apiClient] 401 received, forcing token refresh...');
      const fresh = await auth.currentUser.getIdToken(true);
      if (fresh) {
        headers.set('authorization', `Bearer ${fresh}`);
        res = await doFetch();
        console.log('[apiClient] Retry response status:', res.status);
      }
    } catch (e) {
      console.warn('[apiClient] token refresh failed');
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[apiClient] Request failed:', text);
    throw new Error(text || `request_failed_${res.status}`);
  }

  // return json or empty object
  return (await res.json().catch(() => ({}))) as T;
}

// high-level calls
export const getMyProfile = () => apiFetch('/v1/profile/me');
export const getVrProfile = () => apiFetch('/v1/vr/profile');
export const getInventory = (includeProduct = false) =>
  apiFetch(`/v1/profile/inventory${includeProduct ? '?includeProduct=true' : ''}`);

