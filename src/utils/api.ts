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

const getApiBase = (): string => {
  // prefer explicit public env for client-side calls
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // fallback to same origin
  return '';
};

export async function fetchQRCode(code: string): Promise<QRResponse> {
  const base = getApiBase();
  const url = `${base}/v1/qrcodes/${encodeURIComponent(code)}`;
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



