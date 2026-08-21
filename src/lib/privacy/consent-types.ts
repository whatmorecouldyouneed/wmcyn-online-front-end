export type ConsentPreferences = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentSource = 'banner' | 'settings' | 'gpc';

export type StoredConsent = {
  version: number;
  timestamp: string;
  preferences: ConsentPreferences;
  source: ConsentSource;
};

// bump this if the consent model changes materially (new category, new processor)
// so previously-stored consent is treated as stale and re-collected
export const CONSENT_VERSION = 1;

export const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};
