import { useEffect, useRef, useState } from 'react';
import { usePrivacy } from './PrivacyProvider';
import styles from '@/styles/Privacy.module.scss';

export default function CookiePreferencesModal() {
  const { preferencesOpen, closePreferences, consent, savePreferences } = usePrivacy();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(consent.analytics);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!preferencesOpen) return;
    setAnalyticsEnabled(consent.analytics);
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    return () => {
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesOpen]);

  useEffect(() => {
    if (!preferencesOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePreferences();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [preferencesOpen, closePreferences]);

  if (!preferencesOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closePreferences();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        ref={dialogRef}
      >
        <h2 id="cookie-prefs-title" className={styles.dialogTitle}>
          cookie preferences
        </h2>

        <div className={styles.category}>
          <div className={styles.categoryHeader}>
            <span className={styles.categoryName}>necessary</span>
            <span className={styles.categoryState}>always on</span>
          </div>
          <p className={styles.categoryDescription}>
            required for core functionality like your cart, login sessions, and remembering this preference.
            these cannot be disabled.
          </p>
        </div>

        <div className={styles.category}>
          <label className={styles.categoryHeader} htmlFor="analytics-toggle">
            <span className={styles.categoryName}>analytics</span>
            <input
              id="analytics-toggle"
              type="checkbox"
              role="switch"
              aria-checked={analyticsEnabled}
              checked={analyticsEnabled}
              onChange={(e) => setAnalyticsEnabled(e.target.checked)}
            />
          </label>
          <p className={styles.categoryDescription}>
            helps us understand how WMCYN is used (Firebase / Google Analytics) so we can improve future
            experiences. off by default.
          </p>
        </div>

        <p className={styles.categoryDescription}>
          WMCYN does not currently use marketing or advertising cookies.
        </p>

        <div className={styles.dialogActions}>
          <button type="button" onClick={closePreferences} className={styles.bannerButtonSecondary}>
            cancel
          </button>
          <button
            type="button"
            onClick={() => savePreferences({ preferences: false, analytics: analyticsEnabled, marketing: false })}
            className={styles.bannerButtonPrimary}
          >
            save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
