import Link from 'next/link';
import { usePrivacy } from './PrivacyProvider';
import styles from '@/styles/Privacy.module.scss';

export default function CookieBanner() {
  const { bannerVisible, acceptAll, rejectOptional, openPreferences } = usePrivacy();

  if (!bannerVisible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Cookie consent">
      <p className={styles.bannerText}>
        WMCYN uses necessary technologies to operate this experience. With your permission, we may also use
        analytics to understand how WMCYN is used and improve future experiences. You can accept, reject
        non-essential technologies, or manage your preferences.{' '}
        <Link href="/privacy" className={styles.bannerLink}>Privacy Policy</Link>
        {' · '}
        <Link href="/cookies" className={styles.bannerLink}>Cookie Policy</Link>
      </p>
      <div className={styles.bannerActions}>
        <button type="button" onClick={rejectOptional} className={styles.bannerButtonSecondary}>
          reject non-essential
        </button>
        <button type="button" onClick={openPreferences} className={styles.bannerButtonSecondary}>
          manage preferences
        </button>
        <button type="button" onClick={acceptAll} className={styles.bannerButtonPrimary}>
          accept all
        </button>
      </div>
    </div>
  );
}
