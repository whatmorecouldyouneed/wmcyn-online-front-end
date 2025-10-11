// simple fetch wrapper that attaches firebase id token
import { auth } from '@/utils/lib/firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const DEV_X_UID = process.env.NEXT_PUBLIC_DEV_X_UID;

async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) {
    console.warn('[apiClient] No currentUser - user not signed in');
    return null;
  }
  return await auth.currentUser.getIdToken();
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  // attach auth
  let token = await getIdToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  } else if (DEV_X_UID) {
    headers.set('x-uid', DEV_X_UID);
  }

  const doFetch = async () => fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });

  let res = await doFetch();

  // retry once on 401 with forced refresh
  if (res.status === 401 && auth?.currentUser) {
    try {
      const fresh = await auth.currentUser.getIdToken(true);
      if (fresh) {
        headers.set('authorization', `Bearer ${fresh}`);
        headers.delete('x-uid');
        res = await doFetch();
      }
    } catch (e) {
      console.warn('[apiClient] Token refresh failed:', e);
    }
  }

  // dev-only fallback: if still 401 and x-uid is configured
  if (res.status === 401 && DEV_X_UID) {
    headers.delete('authorization');
    headers.set('x-uid', DEV_X_UID);
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[apiClient] Request failed:', res.status, text);
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

