import React, { useMemo } from 'react';
import type { ARShareMetadata } from '@/types/arSessions';
import { buildNarrativeLine, SHARE_CARD_EYEBROW } from '@/utils/shareNarrative';
import styles from './ARShareCard.module.scss';

interface ARShareCardProps {
  shareMetadata: ARShareMetadata;
}

// rendered at 1080×1920 (9:16) — matches instagram story dimensions.
// captured by html-to-image: faux glass (gradients) reads reliably without backdrop blur.
const ARShareCard = React.forwardRef<HTMLDivElement, ARShareCardProps>(
  ({ shareMetadata }, ref) => {
    const narrative = useMemo(() => buildNarrativeLine(shareMetadata), [shareMetadata]);

    return (
      <div ref={ref} className={styles.card}>
        <div className={styles.bg} />

        <div className={styles.safeZone}>
          <div className={styles.brand}>wmcyn</div>

          <div className={styles.content}>
            <div className={styles.glassPanel}>
              <div className={styles.shine} aria-hidden />
              <div className={styles.glassInner}>
                <p className={styles.eyebrow}>{SHARE_CARD_EYEBROW}</p>
                <h2 className={styles.title}>{shareMetadata.title}</h2>
                {narrative ? <p className={styles.narrative}>{narrative}</p> : null}
                {shareMetadata.ctaLabel ? (
                  <div className={styles.ctaPill}>{shareMetadata.ctaLabel}</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <p className={styles.scanHint}>scan the link to open this moment in ar</p>
            <p className={styles.shareUrl}>{shareMetadata.shareUrl}</p>
          </div>
        </div>
      </div>
    );
  }
);

ARShareCard.displayName = 'ARShareCard';

export default ARShareCard;
