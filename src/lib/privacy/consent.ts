import { getCookie, setCookie } from './cookieStore';
import { CONSENT_VERSION, ConsentPreferences, ConsentSource, StoredConsent } from './consent-types';

export const CONSENT_COOKIE_NAME = 'wmcyn_privacy_preferences';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readStoredConsent(): StoredConsent | null {
  const raw = getCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredConsent;
    // consent model changed since this was stored — treat as unset so it's re-collected
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredConsent(preferences: ConsentPreferences, source: ConsentSource): StoredConsent {
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    preferences: { ...preferences, necessary: true },
    source,
  };
  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(stored), ONE_YEAR_SECONDS);
  return stored;
}
