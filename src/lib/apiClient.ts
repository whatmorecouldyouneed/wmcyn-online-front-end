// simple fetch wrapper that attaches firebase id token
import { auth } from '@/utils/lib/firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
const DEV_X_UID = process.env.NEXT_PUBLIC_DEV_X_UID;

async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return await auth.currentUser.getIdToken();
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  // attach auth
  const token = await getIdToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  else if (DEV_X_UID) headers.set('x-uid', DEV_X_UID);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
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

