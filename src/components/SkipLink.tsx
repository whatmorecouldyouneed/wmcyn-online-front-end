import styles from '@/styles/Footer.module.scss';

export default function SkipLink() {
  return (
    <a href="#main-content" className={styles.skipLink}>
      skip to main content
    </a>
  );
}
