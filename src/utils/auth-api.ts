// utils/auth-api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';

export interface PairingCode {
  code: string;
  expiresAt: string;
}

export interface ExchangeResponse {
  customToken?: string;
  status?: string;
  error?: string;
}

export class AuthAPI {
  // create a new pairing code (for VR app)
  static async createCode(): Promise<PairingCode> {
    const response = await fetch(`${API_BASE}/v1/auth/code.create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to create pairing code');
    }

    return response.json();
  }

  // attach code to authenticated user (for phone app)
  static async attachCode(code: string, idToken: string): Promise<{ ok: boolean }> {
    const response = await fetch(`${API_BASE}/v1/auth/code.attach`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: code.toUpperCase() }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to attach code');
    }

    return response.json();
  }

  // exchange code for custom token (for VR app)
  static async exchangeCode(code: string): Promise<ExchangeResponse> {
    const response = await fetch(`${API_BASE}/v1/auth/code.exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.toUpperCase() }),
    });

    const data = await response.json();

    if (response.status === 200) {
      return { customToken: data.customToken };
    } else if (response.status === 202) {
      return { status: data.status };
    } else if (response.status === 410) {
      return { error: 'expired' };
    } else {
      throw new Error(data.error || 'Exchange failed');
    }
  }
}
