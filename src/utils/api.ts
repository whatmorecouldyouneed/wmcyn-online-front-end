import { useAuth } from "@/contexts/AuthContext";

export interface QRTargetProduct {
  type: 'product';
  productId?: string;
}

export interface QRTargetSession {
  type: 'session';
  sessionId?: string;
}

export type QRTarget = QRTargetProduct | QRTargetSession;

export interface QRResponse {
  target: QRTarget;
  metadata?: any; // keeping flexible per backend
  assetUrl?: string;
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!; // e.g., https://us-central1-.../api

// Non-hook helper for places where hooks aren't allowed:
export async function authFetch(getIdToken: () => Promise<string | null>, path: string, init: RequestInit = {}) {
  const attempt = async (force?: boolean) => {
    const token = (await getIdToken(!!force)) ?? "";
    return fetch(`${BASE}${path}`, { 
      ...init, 
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } 
    });
  };
  let res = await attempt(false);
  if (res.status === 401) res = await attempt(true);
  return res; // Let caller handle UI (redirect/CTA) if still 401
}

// Convenience hooks for components:
export function useApi() {
  const { getIdToken } = useAuth();
  return {
    get: (path: string) => authFetch(getIdToken, path, { method: "GET" }),
    post: (path: string, body?: any) =>
      authFetch(getIdToken, path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      }),
  };
}

// Keep existing QR fetcher for backward compatibility
export async function fetchQRCode(code: string): Promise<QRResponse> {
  const url = `${BASE}/v1/qrcodes/${encodeURIComponent(code)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'omit',
    cache: 'no-store',
    mode: 'cors',
  });

  if (res.status === 404 || res.status === 410) {
    throw new Error('expired_or_invalid');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`request_failed:${res.status}:${text}`);
  }

  return res.json();
}



