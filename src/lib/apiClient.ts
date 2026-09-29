// fetch wrappers for the wmcyn api. public calls use the site's firebase user,
// admin calls use the founder signed in to the backend firebase project.
import { auth, backendAuth } from '@/utils/lib/firebase';
import {
  ProductSet,
  CreateProductSetRequest,
  UpdateProductSetRequest,
  ProductSetsResponse,
  QRCodeData,
  GenerateQRCodeRequest,
  GenerateQRCodeResponse,
  QRCodesResponse,
  ProductSetStats,
  PublicProductSet,
} from '@/types/productSets';
import {
  ARSessionData,
  CreateARSessionRequest,
  UpdateARSessionRequest,
  ARSessionListResponse,
  MarkerPattern,
  MarkerPatternListResponse,
  UploadMarkerPatternRequest,
  UploadMarkerPatternResponse,
  ArConfigResponse
} from '@/types/arSessions';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
const DEV_X_UID = process.env.NEXT_PUBLIC_DEV_X_UID;

async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error('[apiClient] Failed to get Firebase token:', error);
    return null;
  }
}

async function errorFromResponse(res: Response): Promise<Error> {
  const text = await res.text().catch(() => '');
  let message = '';
  try {
    const body = JSON.parse(text);
    message = body?.error || body?.message || '';
  } catch {
    message = text.replace(/<[^>]*>/g, '').trim();
  }

  if (res.status === 401) return new Error('Unauthorized - please sign in again');
  if (res.status === 403) return new Error('Forbidden - this account does not have admin access');
  if (res.status === 404) return new Error(message || 'Resource not found');
  if (res.status >= 500) return new Error('Server error');
  return new Error(message || `Request failed with status ${res.status}`);
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  const token = await getIdToken();
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

  if (!res.ok) throw await errorFromResponse(res);
  return (await res.json().catch(() => ({}))) as T;
}

async function publicFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'omit', cache: 'no-store' });
  if (!res.ok) throw await errorFromResponse(res);
  return (await res.json().catch(() => ({}))) as T;
}

// the backend enforces founder/admin on every admin route; the browser only ever sends
// the signed-in founder's id token, never a shared admin key
export async function adminApiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const user = backendAuth?.currentUser;
  if (!user) throw new Error('Unauthorized - please sign in again');

  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  const doFetch = async (forceRefresh: boolean) => {
    headers.set('authorization', `Bearer ${await user.getIdToken(forceRefresh)}`);
    return fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  };

  let res = await doFetch(false);
  // a freshly granted role only shows up in the token after a refresh
  if (res.status === 401 || res.status === 403) res = await doFetch(true);

  if (!res.ok) throw await errorFromResponse(res);
  return (await res.json().catch(() => ({}))) as T;
}

// high-level calls
export const getMyProfile = () => apiFetch('/v1/profile/me');
export const getVrProfile = () => apiFetch('/v1/vr/profile');
export const getInventory = (includeProduct = false) =>
  apiFetch(`/v1/profile/inventory${includeProduct ? '?includeProduct=true' : ''}`);

export type AdminProfile = { id: string; email: string | null; roles: string[]; hasAccess: boolean };
export const getAdminProfile = () => adminApiFetch<AdminProfile>('/v1/profile/me');

const EMPTY_STATS: ProductSetStats = { totalClaims: 0, remainingInventory: 0, qrCodesGenerated: 0 };

export function toProductSet(raw: any): ProductSet {
  return {
    ...raw,
    id: String(raw?.id || ''),
    name: String(raw?.name || ''),
    items: Array.isArray(raw?.items) ? raw.items : [],
    checkoutMode: raw?.checkoutMode || 'NONE',
    stats: raw?.stats || EMPTY_STATS,
  };
}

function toQRCodes(raw: any): QRCodeData[] {
  const list = raw?.qrcodes || raw?.qrCodes || (Array.isArray(raw) ? raw : []);
  return (list as any[]).map((qr) => ({ ...qr, id: qr.id || qr.code }));
}

async function loadStats(productSetId: string): Promise<ProductSetStats> {
  const [stats, qrs] = await Promise.allSettled([
    publicFetch(`/v1/productSets/${encodeURIComponent(productSetId)}/stats`),
    getQRCodes(productSetId),
  ]);
  return {
    totalClaims: stats.status === 'fulfilled' ? Number(stats.value?.totalClaims) || 0 : 0,
    remainingInventory: stats.status === 'fulfilled' ? Number(stats.value?.remainingTotal) || 0 : 0,
    qrCodesGenerated: qrs.status === 'fulfilled' ? qrs.value.qrCodes.length : 0,
  };
}

// product sets
export const getProductSets = async (): Promise<ProductSetsResponse> => {
  const res = await adminApiFetch<{ items?: any[]; total?: number }>('/v1/productSets?limit=100');
  const productSets = (res.items || []).map(toProductSet);
  const stats = await Promise.all(productSets.map((ps) => loadStats(ps.id)));
  return {
    productSets: productSets.map((ps, i) => ({ ...ps, stats: stats[i] })),
    total: res.total ?? productSets.length,
  };
};

export const getProductSet = async (id: string): Promise<ProductSet> => {
  const [raw, stats] = await Promise.all([
    adminApiFetch(`/v1/productSets/${encodeURIComponent(id)}`),
    loadStats(id),
  ]);
  return { ...toProductSet(raw), stats };
};

export const getPublicProductSetBySlug = (slug: string): Promise<PublicProductSet> =>
  publicFetch(`/v1/productSets/by-slug/${encodeURIComponent(slug)}`);

export const createProductSet = async (data: CreateProductSetRequest): Promise<ProductSet> =>
  toProductSet(await adminApiFetch('/v1/productSets/create', {
    method: 'POST',
    body: JSON.stringify(data)
  }));

export const updateProductSet = async (id: string, data: UpdateProductSetRequest): Promise<ProductSet> =>
  toProductSet(await adminApiFetch(`/v1/productSets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }));

export const deleteProductSet = (id: string): Promise<void> =>
  adminApiFetch(`/v1/productSets/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

export const uploadNftMarker = (productSetId: string, data: {
  sourceImageData: string;
  mindFileData: string;
  filename: string;
  quality?: number;
}) => adminApiFetch(`/v1/productSets/${encodeURIComponent(productSetId)}/nft-marker`, {
  method: 'POST',
  body: JSON.stringify(data)
});

// qr codes
export const generateQRCode = (data: GenerateQRCodeRequest): Promise<GenerateQRCodeResponse> =>
  adminApiFetch('/v1/qrcodes/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  });

// the backend lists qr codes per product set only
export const getQRCodes = async (productSetId: string): Promise<QRCodesResponse> => {
  const res = await adminApiFetch(`/v1/qrcodes?productSetId=${encodeURIComponent(productSetId)}`);
  const qrCodes = toQRCodes(res);
  return { qrCodes, total: qrCodes.length };
};

export const getQRCode = (code: string): Promise<QRCodeData> =>
  publicFetch(`/v1/qrcodes/${encodeURIComponent(code)}`);

export const deleteQRCode = (code: string): Promise<void> =>
  adminApiFetch(`/v1/qrcodes/${encodeURIComponent(code)}`, {
    method: 'DELETE'
  });

// ar session api functions
function toARSession(raw: any): ARSessionData {
  return { ...raw, sessionId: String(raw?.sessionId || raw?.id || '') };
}

export const arSessions = {
  // public viewer payload
  get: async (id: string): Promise<ARSessionData> =>
    toARSession(await publicFetch(`/api/ar-sessions/${encodeURIComponent(id)}/data`)),

  list: async (filters?: { status?: string; campaign?: string }): Promise<ARSessionListResponse> => {
    const query = filters ? new URLSearchParams(filters).toString() : '';
    const res = await adminApiFetch(`/v1/ar-sessions${query ? `?${query}` : ''}`);
    const sessions = (res?.sessions || res?.arSessions || []).map(toARSession);
    return { arSessions: sessions, total: sessions.length };
  },

  create: async (data: CreateARSessionRequest): Promise<ARSessionData> =>
    toARSession(await adminApiFetch('/v1/ar-sessions/create', {
      method: 'POST',
      body: JSON.stringify(data)
    })),

  update: async (id: string, updates: UpdateARSessionRequest): Promise<ARSessionData> =>
    adminApiFetch(`/v1/ar-sessions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

  delete: async (id: string): Promise<void> =>
    adminApiFetch(`/v1/ar-sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
};

// marker pattern api functions
export const markerPatterns = {
  list: async (): Promise<MarkerPatternListResponse> =>
    adminApiFetch('/v1/marker-patterns'),

  get: async (id: string): Promise<MarkerPattern> =>
    adminApiFetch(`/v1/marker-patterns/${encodeURIComponent(id)}`),

  upload: async (data: UploadMarkerPatternRequest): Promise<UploadMarkerPatternResponse> =>
    adminApiFetch('/v1/marker-patterns/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: async (id: string, updates: { name?: string }): Promise<MarkerPattern> =>
    adminApiFetch(`/v1/marker-patterns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

  delete: async (id: string): Promise<void> =>
    adminApiFetch(`/v1/marker-patterns/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
};

// generate qr code for ar session
export const generateARSessionQR = async (sessionId: string, options?: {
  label?: string;
  campaign?: string;
  expiresAt?: string;
}) => generateQRCode({
  target: { type: 'AR_SESSION', sessionId },
  ...options
});

// fetch ar config by qr code (public endpoint, no auth required)
export const fetchArConfigByCode = (code: string): Promise<ArConfigResponse> =>
  publicFetch(`/v1/qrcodes/${encodeURIComponent(code)}/ar-config`);
