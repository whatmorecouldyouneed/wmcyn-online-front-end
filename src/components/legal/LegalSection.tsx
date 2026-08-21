import styles from '@/styles/Legal.module.scss';
import type { LegalSectionData } from './types';

export default function LegalSection({ section }: { section: LegalSectionData }) {
  return (
    <section id={section.id} className={styles.section} aria-labelledby={`${section.id}-heading`}>
      <h2 id={`${section.id}-heading`} className={styles.sectionHeading}>
        {section.heading}
      </h2>
      <div className={styles.sectionBody}>
        {section.body.map((block, i) =>
          typeof block === 'string' ? (
            <p key={i}>{block}</p>
          ) : (
            <ul key={i}>
              {block.list.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}
