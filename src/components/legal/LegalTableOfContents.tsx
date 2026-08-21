import styles from '@/styles/Legal.module.scss';
import type { LegalSectionData } from './types';

export default function LegalTableOfContents({ sections }: { sections: LegalSectionData[] }) {
  return (
    <nav aria-label="Table of contents" className={styles.toc}>
      <strong>on this page</strong>
      <ol>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>{section.heading}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
