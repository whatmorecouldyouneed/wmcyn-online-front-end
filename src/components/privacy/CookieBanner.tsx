import Link from 'next/link';
import { usePrivacy } from './PrivacyProvider';
import styles from '@/styles/Privacy.module.scss';

export default function CookieBanner() {
  const { bannerVisible, acceptAll, rejectOptional, openPreferences } = usePrivacy();

  if (!bannerVisible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Cookie consent">
      <p className={styles.bannerText}>
        we use cookies, and analytics with your permission.{' '}
        <Link href="/cookies" className={styles.bannerLink}>cookie policy</Link>
      </p>
      <div className={styles.bannerControls}>
        <div className={styles.bannerActions}>
          <button type="button" onClick={rejectOptional} className={styles.bannerButtonSecondary}>
            reject
          </button>
          <button type="button" onClick={acceptAll} className={styles.bannerButtonPrimary}>
            accept
          </button>
        </div>
        <button type="button" onClick={openPreferences} className={styles.bannerButtonText}>
          manage
        </button>
      </div>
    </div>
  );
}
