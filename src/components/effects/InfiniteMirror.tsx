'use client';

import React, { useEffect, useState, memo, CSSProperties } from 'react';
import styles from './InfiniteMirror.module.scss';

const LAYERS = 6;
const DURATION = 20; // seconds per full cycle

const InfiniteMirror: React.FC<{ className?: string }> = ({ className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`${styles.infiniteContainer} ${className || ''}`}>
      {Array.from({ length: LAYERS }).map((_, i) => (
        <div
          key={i}
          className={styles.animatedLayer}
          style={{
            '--animation-delay': `-${(DURATION / LAYERS) * i}s`,
            '--duration': `${DURATION}s`,
            zIndex: LAYERS - i,
          } as CSSProperties}
        >
          <div className={styles.levelBorder}>
            <div className={styles.levelContent} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(InfiniteMirror);
