import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { ConsentPreferences, ConsentSource, DEFAULT_CONSENT } from '@/lib/privacy/consent-types';
import { readStoredConsent, writeStoredConsent } from '@/lib/privacy/consent';
import { getGlobalPrivacyControl } from '@/lib/privacy/gpc';
import { initAnalytics } from '@/utils/lib/firebase';

type PrivacyContextValue = {
  consent: ConsentPreferences;
  consentSource: ConsentSource | null;
  bannerVisible: boolean;
  preferencesOpen: boolean;
  gpcDetected: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (prefs: Pick<ConsentPreferences, 'preferences' | 'analytics' | 'marketing'>) => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<ConsentPreferences>(DEFAULT_CONSENT);
  const [consentSource, setConsentSource] = useState<ConsentSource | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [gpcDetected, setGpcDetected] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // on first mount: honor a previously-stored choice, otherwise honor a GPC opt-out signal
  // without prompting again, otherwise show the banner so the visitor can choose.
  useEffect(() => {
    const stored = readStoredConsent();
    const gpc = getGlobalPrivacyControl();
    setGpcDetected(gpc);

    if (stored) {
      setConsentState(stored.preferences);
      setConsentSource(stored.source);
      setBannerVisible(false);
    } else if (gpc) {
      const prefs: ConsentPreferences = { ...DEFAULT_CONSENT };
      writeStoredConsent(prefs, 'gpc');
      setConsentState(prefs);
      setConsentSource('gpc');
      setBannerVisible(false);
    } else {
      setBannerVisible(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !consent.analytics) return;
    initAnalytics();
  }, [hydrated, consent.analytics]);

  const persist = useCallback((prefs: ConsentPreferences, source: ConsentSource) => {
    writeStoredConsent(prefs, source);
    setConsentState(prefs);
    setConsentSource(source);
    setBannerVisible(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ necessary: true, preferences: true, analytics: true, marketing: true }, 'banner');
  }, [persist]);

  const rejectOptional = useCallback(() => {
    persist({ ...DEFAULT_CONSENT }, 'banner');
  }, [persist]);

  const savePreferences = useCallback(
    (prefs: Pick<ConsentPreferences, 'preferences' | 'analytics' | 'marketing'>) => {
      persist({ necessary: true, ...prefs }, 'settings');
      setPreferencesOpen(false);
    },
    [persist]
  );

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      consent,
      consentSource,
      bannerVisible,
      preferencesOpen,
      gpcDetected,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [consent, consentSource, bannerVisible, preferencesOpen, gpcDetected, acceptAll, rejectOptional, savePreferences, openPreferences, closePreferences]
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}
