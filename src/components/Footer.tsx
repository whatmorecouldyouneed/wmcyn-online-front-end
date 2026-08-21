import Link from 'next/link';
import PrivacySettingsButton from '@/components/privacy/PrivacySettingsButton';
import { siteConfig } from '@/config/site';
import styles from '@/styles/Footer.module.scss';

export default function Footer() {
  const year = new Date().getFullYear();
  const contactHref = siteConfig.privacyEmail ? `mailto:${siteConfig.privacyEmail}` : '/privacy-choices';

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copyright}>© {year} WMCYN</span>
        <nav aria-label="Legal" className={styles.nav}>
          <Link href="/privacy" className={styles.link}>privacy</Link>
          <Link href="/terms" className={styles.link}>terms</Link>
          <Link href="/cookies" className={styles.link}>cookie policy</Link>
          <Link href="/privacy-choices" className={styles.link}>privacy choices</Link>
          <Link href="/accessibility" className={styles.link}>accessibility</Link>
          <Link href="/shipping-returns" className={styles.link}>shipping &amp; returns</Link>
          <PrivacySettingsButton className={styles.link} />
          <a href={contactHref} className={styles.link}>contact</a>
        </nav>
      </div>
    </footer>
  );
}
