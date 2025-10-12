// simple fetch wrapper that attaches firebase id token
import { auth } from '@/utils/lib/firebase';
import { 
  ProductSet, 
  CreateProductSetRequest, 
  UpdateProductSetRequest,
  ProductSetsResponse,
  QRCodeData,
  GenerateQRCodeRequest,
  GenerateQRCodeResponse,
  QRCodesResponse
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

// use deployed Firebase Cloud Functions API directly
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api-rrm3u3yaba-uc.a.run.app';
const PROXY_BASE = '/api/proxy';
const DEV_X_UID = process.env.NEXT_PUBLIC_DEV_X_UID;
const ADMIN_API_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN;

async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) {
    console.warn('[apiClient] No currentUser - user not signed in');
    return null;
  }
  
  try {
    const token = await auth.currentUser.getIdToken();
    console.log('[apiClient] Got Firebase token:', token ? 'present' : 'missing');
    console.log('[apiClient] User UID:', auth.currentUser.uid);
    console.log('[apiClient] User is anonymous:', auth.currentUser.isAnonymous);
    console.log('[apiClient] Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    return token;
  } catch (error) {
    console.error('[apiClient] Failed to get Firebase token:', error);
    return null;
  }
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  // attach auth
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

// admin API functions for product sets - use Firebase auth like regular API calls
async function adminApiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  // use Firebase authentication for admin endpoints
  const token = await getIdToken();
  
  console.log('[adminApiClient] Processing path:', path);
  
  // for admin-only endpoints, prioritize admin API token
  if (path.includes('/marker-patterns') || path.includes('/ar-sessions')) {
    if (ADMIN_API_TOKEN) {
      headers.set('x-admin-token', ADMIN_API_TOKEN);
      console.log('[adminApiClient] Using admin API token for admin endpoint request to:', path);
    } else {
      console.warn('[adminApiClient] Admin API token not available for admin endpoint request');
      // fall back to Firebase auth for admin endpoints
      if (token && auth?.currentUser) {
        headers.set('authorization', `Bearer ${token}`);
        headers.set('x-uid', auth.currentUser.uid);
        console.log('[adminApiClient] Falling back to Firebase token for admin endpoint request');
      }
    }
  } else if (path.includes('/productSets')) {
    // product sets require admin privileges - use admin token only (no user ID needed)
    if (ADMIN_API_TOKEN) {
      headers.set('x-admin-token', ADMIN_API_TOKEN);
      console.log('[adminApiClient] Using admin API token for product sets request to:', path);
    } else if (token && auth?.currentUser) {
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-uid', auth.currentUser.uid);
      console.log('[adminApiClient] Using Firebase token for product sets request to:', path);
      console.log('[adminApiClient] User UID:', auth.currentUser.uid);
    } else {
      console.warn('[adminApiClient] No authentication available for product sets request');
    }
  } else if (path.includes('/qrcodes') || path.includes('qrcodes')) {
    // QR codes endpoint - use x-admin-token as specified in backend docs
    console.log('[adminApiClient] QR codes path detected:', path);
    if (ADMIN_API_TOKEN) {
      // Use x-admin-token as specified in backend documentation
      headers.set('x-admin-token', ADMIN_API_TOKEN);
      console.log('[adminApiClient] Using x-admin-token for QR codes request to:', path);
    } else if (token && auth?.currentUser) {
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-uid', auth.currentUser.uid);
      console.log('[adminApiClient] Using Firebase token for QR codes request to:', path);
      console.log('[adminApiClient] User UID:', auth.currentUser.uid);
    } else {
      console.warn('[adminApiClient] No authentication available for QR codes request');
    }
  } else if (token && auth?.currentUser) {
    headers.set('authorization', `Bearer ${token}`);
    headers.set('x-uid', auth.currentUser.uid);
    console.log('[adminApiClient] Using Firebase token for request to:', path);
    console.log('[adminApiClient] User UID:', auth.currentUser.uid);
  } else if (ADMIN_API_TOKEN) {
    headers.set('x-admin-token', ADMIN_API_TOKEN);
    console.log('[adminApiClient] Using admin API token for request to:', path);
  } else if (DEV_X_UID) {
    headers.set('x-uid', DEV_X_UID);
    console.log('[adminApiClient] Using dev x-uid for request to:', path);
  } else {
    console.warn('[adminApiClient] No authentication available for request to:', path);
  }

  const doFetch = async () => {
    console.log('[adminApiClient] Making request to:', `${API_BASE}${path}`);
    console.log('[adminApiClient] Headers being sent:', {
      'x-admin-token': headers.get('x-admin-token') ? 'present' : 'missing',
      'x-cron-key': headers.get('x-cron-key') ? 'present' : 'missing',
      'authorization': headers.get('authorization') ? 'present' : 'missing',
      'x-uid': headers.get('x-uid') ? 'present' : 'missing'
    });
    return fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  };

  let res = await doFetch();

  // retry once on 401 with forced refresh (but only if we're not using admin token)
  if (res.status === 401 && auth?.currentUser && !headers.get('x-admin-token')) {
    console.log('[adminApiClient] Got 401, attempting token refresh...');
    try {
      const fresh = await auth.currentUser.getIdToken(true);
      if (fresh) {
        headers.set('authorization', `Bearer ${fresh}`);
        headers.set('x-uid', auth.currentUser.uid);
        console.log('[adminApiClient] Retrying with fresh token...');
        res = await doFetch();
      }
    } catch (e) {
      console.warn('[adminApiClient] Token refresh failed:', e);
    }
  }

  // fallback: if still 401, try admin API token in different formats
  if (res.status === 401 && ADMIN_API_TOKEN) {
    console.log('[adminApiClient] Still 401, trying admin API token fallback...');
    headers.delete('authorization');
    headers.delete('x-uid');
    
    // try as x-admin-token first
    headers.set('x-admin-token', ADMIN_API_TOKEN);
    console.log('[adminApiClient] Trying admin token as x-admin-token...');
    res = await doFetch();

    // if still 401, try as x-cron-key (alternative header name)
    if (res.status === 401) {
      console.log('[adminApiClient] Still 401, trying admin token as x-cron-key...');
      headers.delete('x-admin-token');
      headers.set('x-cron-key', ADMIN_API_TOKEN);
      res = await doFetch();
    }

    // if still 401, try as Bearer token
    if (res.status === 401) {
      console.log('[adminApiClient] Still 401, trying admin token as Bearer...');
      headers.delete('x-cron-key');
      headers.set('authorization', `Bearer ${ADMIN_API_TOKEN}`);
      res = await doFetch();
    }
  }

  // dev-only fallback: if still 401 and x-uid is configured
  if (res.status === 401 && DEV_X_UID) {
    console.log('[adminApiClient] Still 401, trying dev x-uid fallback...');
    headers.delete('authorization');
    headers.delete('x-admin-token');
    headers.set('x-uid', DEV_X_UID);
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[adminApiClient] Request failed:', {
      status: res.status,
      statusText: res.statusText,
      url: `${API_BASE}${path}`,
      responseText: text,
      hasAuth: !!headers.get('authorization'),
      hasAdminToken: !!headers.get('x-admin-token'),
      hasCronKey: !!headers.get('x-cron-key'),
      hasXUid: !!headers.get('x-uid')
    });
    
    // provide more helpful error messages
    if (res.status === 401) {
      if (text.includes('invalid token')) {
        throw new Error('Authentication failed - token may be invalid or backend not updated');
      } else if (text.includes('Forbidden')) {
        throw new Error('Access denied - admin privileges required');
      } else {
        throw new Error('Authentication required - check if backend supports the authentication method');
      }
    }
    
    throw new Error(text || `admin_request_failed_${res.status}`);
  }

  const jsonResponse = await res.json().catch(() => ({}));
  return jsonResponse as T;
}

// high-level calls
export const getMyProfile = () => apiFetch('/v1/profile/me');
export const getVrProfile = () => apiFetch('/v1/vr/profile');
export const getInventory = (includeProduct = false) =>
  apiFetch(`/v1/profile/inventory${includeProduct ? '?includeProduct=true' : ''}`);

// admin product sets API calls - updated to match deployed endpoints
export const getProductSets = (): Promise<ProductSetsResponse> => 
  adminApiFetch('/v1/productSets');

export const getProductSet = (id: string): Promise<ProductSet> => 
  adminApiFetch(`/v1/productSets/${id}`);

export const createProductSet = (data: CreateProductSetRequest): Promise<ProductSet> => 
  adminApiFetch('/v1/productSets/create', {
    method: 'POST',
    body: JSON.stringify(data)
  });

export const updateProductSet = (id: string, data: UpdateProductSetRequest): Promise<ProductSet> => 
  adminApiFetch(`/v1/productSets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });

export const deleteProductSet = (id: string): Promise<void> => 
  adminApiFetch(`/v1/productSets/${id}`, {
    method: 'DELETE'
  });

// admin QR codes API calls - updated to match deployed endpoints
export const generateQRCode = (data: GenerateQRCodeRequest): Promise<GenerateQRCodeResponse> => 
  adminApiFetch('/v1/qrcodes/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  });

export const getQRCodes = (productSetId?: string): Promise<QRCodesResponse> => {
  const params = productSetId ? `?productSetId=${productSetId}` : '';
  return adminApiFetch(`/v1/qrcodes${params}`);
};

export const getQRCode = (id: string): Promise<QRCodeData> => 
  adminApiFetch(`/v1/qrcodes/${id}`);

export const deleteQRCode = (id: string): Promise<void> => 
  adminApiFetch(`/v1/qrcodes/${id}`, {
    method: 'DELETE'
  });

// AR Scene API functions
export const arScenesApi = {
  // create ar scene
  create: async (sceneData: any) => {
    return adminApiFetch('/v1/ar-scenes/create', {
      method: 'POST',
      body: JSON.stringify(sceneData)
    });
  },

  // list ar scenes
  list: async (filters?: { status?: string; campaign?: string }) => {
    const params = new URLSearchParams(filters);
    return adminApiFetch(`/v1/ar-scenes?${params}`);
  },

  // get ar scene
  get: async (id: string) => {
    return adminApiFetch(`/v1/ar-scenes/${id}`);
  },

  // update ar scene
  update: async (id: string, updates: any) => {
    return adminApiFetch(`/v1/ar-scenes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // delete ar scene
  delete: async (id: string) => {
    return adminApiFetch(`/v1/ar-scenes/${id}`, {
      method: 'DELETE'
    });
  }
};

// generate qr code for ar scene
export const generateARSceneQR = async (sessionId: string, options?: {
  label?: string;
  campaign?: string;
  expiresAt?: string;
}) => {
  return adminApiFetch('/v1/qrcodes/generate', {
    method: 'POST',
    body: JSON.stringify({
      target: {
        type: 'AR_SESSION',
        sessionId
      },
      ...options
    })
  });
};

// ar session api functions
export const arSessions = {
  // get ar session data for viewer
  get: async (id: string): Promise<ARSessionData> => {
    return apiFetch(`/v1/ar-sessions/${id}/data`);
  },

  // list ar sessions (admin)
  list: async (filters?: { status?: string; campaign?: string }): Promise<ARSessionListResponse> => {
    const params = new URLSearchParams(filters);
    return adminApiFetch(`/v1/ar-sessions?${params}`);
  },

  // create ar session (admin)
  create: async (data: CreateARSessionRequest): Promise<ARSessionData> => {
    return adminApiFetch('/v1/ar-sessions/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // update ar session (admin)
  update: async (id: string, updates: UpdateARSessionRequest): Promise<ARSessionData> => {
    return adminApiFetch(`/v1/ar-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // delete ar session (admin)
  delete: async (id: string): Promise<void> => {
    return adminApiFetch(`/v1/ar-sessions/${id}`, {
      method: 'DELETE'
    });
  }
};

// marker pattern api functions
export const markerPatterns = {
  // list marker patterns (admin)
  list: async (): Promise<MarkerPatternListResponse> => {
    return adminApiFetch('/v1/marker-patterns');
  },

  // get marker pattern (admin)
  get: async (id: string): Promise<MarkerPattern> => {
    return adminApiFetch(`/v1/marker-patterns/${id}`);
  },

  // upload marker pattern (admin)
  upload: async (data: UploadMarkerPatternRequest): Promise<UploadMarkerPatternResponse> => {
    return adminApiFetch('/v1/marker-patterns/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // update marker pattern (admin)
  update: async (id: string, updates: { name?: string }): Promise<MarkerPattern> => {
    return adminApiFetch(`/v1/marker-patterns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // delete marker pattern (admin)
  delete: async (id: string): Promise<void> => {
    return adminApiFetch(`/v1/marker-patterns/${id}`, {
      method: 'DELETE'
    });
  }
};

// generate qr code for ar session
export const generateARSessionQR = async (sessionId: string, options?: {
  label?: string;
  campaign?: string;
  expiresAt?: string;
}) => {
  return adminApiFetch('/v1/qrcodes/generate', {
    method: 'POST',
    body: JSON.stringify({
      target: {
        type: 'AR_SESSION',
        sessionId
      },
      ...options
    })
  });
};

// fetch ar config by qr code (public endpoint, no auth required)
export const fetchArConfigByCode = async (code: string): Promise<ArConfigResponse> => {
  const res = await fetch(`${API_BASE}/v1/qrcodes/${encodeURIComponent(code)}/ar-config`, { 
    method: 'GET', 
    credentials: 'omit' 
  });
  if (!res.ok) throw new Error(`ar-config ${res.status}`);
  return res.json();
};

