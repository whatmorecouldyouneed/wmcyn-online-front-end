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
  MarkerValidation,
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
    
    // provide cleaner error messages based on status code
    if (res.status === 404) {
      throw new Error('Resource not found');
    } else if (res.status === 401) {
      throw new Error('Unauthorized');
    } else if (res.status === 403) {
      throw new Error('Forbidden');
    } else if (res.status >= 500) {
      throw new Error('Server error');
    } else {
      // for other errors, try to extract meaningful message from response
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      throw new Error(cleanText || `Request failed with status ${res.status}`);
    }
  }

  // return json or empty object
  return (await res.json().catch(() => ({}))) as T;
}

// admin API functions for product sets - use Firebase auth like regular API calls
async function adminApiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  // #region agent log
  const isClient = typeof window !== 'undefined';
  fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:113',message:'adminApiFetch entry',data:{path,isClient,apiBase:API_BASE,envApiBase:process.env.NEXT_PUBLIC_API_BASE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');

  // use Firebase authentication for admin endpoints
  const token = await getIdToken();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:120',message:'got token',data:{hasToken:!!token,hasAuth:!!auth?.currentUser,hasAdminToken:!!ADMIN_API_TOKEN,hasDevXUid:!!DEV_X_UID},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
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
        console.log('[adminApiClient] User UID:', auth.currentUser.uid);
      } else {
        console.error('[adminApiClient] No authentication available - neither admin token nor Firebase auth');
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
    // use proxy in development to bypass CORS, direct API in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment ? PROXY_BASE : API_BASE;
    const fullUrl = `${baseUrl}${path}`;
    const isClient = typeof window !== 'undefined';
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:179',message:'doFetch called',data:{isDevelopment,baseUrl,apiBase:API_BASE,path,fullUrl,isClient,envApiBase:process.env.NEXT_PUBLIC_API_BASE},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('[adminApiClient] Making request to:', fullUrl);
    console.log('[adminApiClient] Headers being sent:', {
      'x-admin-token': headers.get('x-admin-token') ? 'present' : 'missing',
      'x-cron-key': headers.get('x-cron-key') ? 'present' : 'missing',
      'authorization': headers.get('authorization') ? 'present' : 'missing',
      'x-uid': headers.get('x-uid') ? 'present' : 'missing'
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:187',message:'fetch call starting',data:{fullUrl,method:init.method||'GET',hasHeaders:!!headers},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:203',message:'fetch attempt',data:{fullUrl,method:init.method||'GET',mode:init.mode||'cors',credentials:init.credentials||'same-origin'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'K'})}).catch(()=>{});
      // #endregion
      const response = await fetch(fullUrl, { ...init, headers, cache: 'no-store' });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:206',message:'fetch succeeded',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return response;
    } catch (fetchError: any) {
      // #region agent log
      const errorDetails: any = {errorMessage:fetchError?.message,errorName:fetchError?.name,fullUrl};
      if (fetchError?.cause) errorDetails.cause = String(fetchError.cause);
      if (fetchError?.stack) errorDetails.errorStack = fetchError.stack.substring(0,300);
      fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:211',message:'fetch failed',data:errorDetails,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw fetchError;
    }
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

  // handle 403 for admin endpoints - try admin token if not already used
  if (res.status === 403 && ADMIN_API_TOKEN && !headers.get('x-admin-token')) {
    const isAdminEndpoint = path.includes('/ar-sessions') || path.includes('/marker-patterns');
    if (isAdminEndpoint) {
      console.log('[adminApiClient] Got 403 on admin endpoint, trying admin token...');
      headers.delete('authorization');
      headers.delete('x-uid');
      headers.set('x-admin-token', ADMIN_API_TOKEN);
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e9ed64ca-e301-4d56-8a7f-1b8071ba48e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:245',message:'request failed',data:{status:res.status,statusText:res.statusText,path,responseText:text.substring(0,200),hasAuth:!!headers.get('authorization'),hasAdminToken:!!headers.get('x-admin-token'),hasCronKey:!!headers.get('x-cron-key'),hasXUid:!!headers.get('x-uid')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'L'})}).catch(()=>{});
    // #endregion
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
    } else if (res.status === 404) {
      throw new Error('Resource not found');
    } else if (res.status === 403) {
      // check if admin token is missing for admin endpoints
      const isAdminEndpoint = path.includes('/ar-sessions') || path.includes('/marker-patterns');
      const hasAdminToken = !!headers.get('x-admin-token');
      if (isAdminEndpoint && !hasAdminToken && !ADMIN_API_TOKEN) {
        throw new Error('Forbidden - Admin endpoints require NEXT_PUBLIC_ADMIN_API_TOKEN to be configured. Please set this environment variable.');
      }
      throw new Error(`Forbidden - ${text || 'Access denied. Admin privileges may be required.'}`);
    } else if (res.status >= 500) {
      throw new Error('Server error');
    } else {
      // for other errors, try to extract meaningful message from response
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      throw new Error(cleanText || `Admin request failed with status ${res.status}`);
    }
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

export const createProductSet = (data: CreateProductSetRequest): Promise<ProductSet> => {
  console.log('[createProductSet] Sending data:', JSON.stringify(data, null, 2));
  return adminApiFetch('/v1/productSets/create', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// test if the backend endpoint exists at all
export const testProductSetEndpoint = async () => {
  try {
    console.log('[testProductSetEndpoint] Testing if endpoint exists...');
    
    // try a simple GET request to see if the endpoint exists
    const response = await fetch('https://api-rrm3u3yaba-uc.a.run.app/v1/productSets', {
      method: 'GET',
      headers: {
        'x-admin-token': 'test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[testProductSetEndpoint] GET response status:', response.status);
    console.log('[testProductSetEndpoint] GET response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('[testProductSetEndpoint] GET response text:', text);
    
    // try a simple POST with minimal data
    const postResponse = await fetch('https://api-rrm3u3yaba-uc.a.run.app/v1/productSets/create', {
      method: 'POST',
      headers: {
        'x-admin-token': 'test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log('[testProductSetEndpoint] POST response status:', postResponse.status);
    const postText = await postResponse.text();
    console.log('[testProductSetEndpoint] POST response text:', postText);
    
  } catch (error) {
    console.error('[testProductSetEndpoint] Error:', error);
  }
};

// test function to try different product set structures
export const testProductSetCreation = async (baseData: any) => {
  const variations = [
    // variation 1: minimal data
    {
      name: baseData.name,
      items: baseData.items,
      checkout: baseData.checkout
    },
    // variation 2: with stats
    {
      ...baseData,
      stats: {
        totalClaims: 0,
        remainingInventory: 0,
        qrCodesGenerated: 0
      }
    },
    // variation 3: different field names
    {
      name: baseData.name,
      description: baseData.description,
      campaign: baseData.campaign,
      items: baseData.items,
      checkout: baseData.checkout,
      arSessionId: baseData.linkedARSessionId, // different field name
      remainingInventory: 0
    },
    // variation 4: with all optional fields
    {
      ...baseData,
      remainingInventory: 0,
      tags: [],
      status: 'active'
    }
  ];

  for (let i = 0; i < variations.length; i++) {
    try {
      console.log(`[testProductSetCreation] Trying variation ${i + 1}:`, variations[i]);
      const result = await adminApiFetch('/v1/productSets/create', {
        method: 'POST',
        body: JSON.stringify(variations[i])
      });
      console.log(`[testProductSetCreation] Variation ${i + 1} succeeded:`, result);
      return result;
    } catch (error: any) {
      console.log(`[testProductSetCreation] Variation ${i + 1} failed:`, error.message);
      if (i === variations.length - 1) {
        throw error; // throw the last error if all variations fail
      }
    }
  }
};

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
    const queryString = params.toString();
    const path = queryString ? `/v1/ar-sessions?${queryString}` : '/v1/ar-sessions';
    return adminApiFetch(path);
  },

  // create ar session (admin)
  create: async (data: CreateARSessionRequest): Promise<ARSessionData> => {
    return adminApiFetch('/v1/ar-sessions', {
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
  },

  // validate marker pattern (admin)
  validate: async (patternId: string, validation: MarkerValidation): Promise<void> => {
    return adminApiFetch(`/v1/marker-patterns/${patternId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ validationResult: validation })
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

