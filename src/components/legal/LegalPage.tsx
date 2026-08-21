import Head from 'next/head';
import LegalSection from './LegalSection';
import LegalTableOfContents from './LegalTableOfContents';
import LegalContact from './LegalContact';
import { siteConfig } from '@/config/site';
import styles from '@/styles/Legal.module.scss';
import type { LegalDocument } from './types';

export default function LegalPage({ document }: { document: LegalDocument }) {
  const canonical = `${siteConfig.url}${document.path}`;

  return (
    <>
      <Head>
        <title>{document.title} | WMCYN</title>
        <meta name="description" content={document.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${document.title} | WMCYN`} />
        <meta property="og:description" content={document.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>{document.title}</h1>
            <p className={styles.meta}>
              effective {document.effectiveDate} · last updated {document.lastUpdated}
            </p>
          </header>

          {document.intro && (
            <div className={styles.intro}>
              {document.intro.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}

          {document.sections.length > 3 && <LegalTableOfContents sections={document.sections} />}

          <div className={styles.body}>
            {document.sections.map((section) => (
              <LegalSection key={section.id} section={section} />
            ))}
          </div>

          {document.showContact !== false && <LegalContact />}
        </div>
      </div>
    </>
  );
}
