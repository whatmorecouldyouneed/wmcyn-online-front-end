import Link from 'next/link';
import { siteConfig } from '@/config/site';
import styles from '@/styles/Legal.module.scss';

export default function LegalContact() {
  return (
    <div className={styles.contact}>
      <h2 className={styles.sectionHeading}>contact</h2>
      {siteConfig.legalEntityName && <p>{siteConfig.legalEntityName}</p>}
      {siteConfig.privacyEmail ? (
        <p>
          email: <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a>
        </p>
      ) : (
        <p>
          our contact email is being finalized. in the meantime, use the form on{' '}
          <Link href="/privacy-choices">privacy choices</Link> to reach us about this page.
        </p>
      )}
      {siteConfig.legalAddress && <p>{siteConfig.legalAddress}</p>}
    </div>
  );
}
