import React from 'react';
import type { ARShareMetadata } from '@/types/arSessions';
import styles from './ARShareCard.module.scss';

interface ARShareCardProps {
  shareMetadata: ARShareMetadata;
}

// rendered at 1080×1920 (9:16) — matches instagram story dimensions.
// this component is rendered offscreen then captured by html-to-image.
// keep all text within the safe-zone (top/bottom 250px margins).
const ARShareCard = React.forwardRef<HTMLDivElement, ARShareCardProps>(
  ({ shareMetadata }, ref) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    return (
      <div ref={ref} className={styles.card}>
        {/* background gradient */}
        <div className={styles.bg} />

        {/* safe zone wrapper — 250px top/bottom padding */}
        <div className={styles.safeZone}>
          {/* top: brand wordmark */}
          <div className={styles.brand}>wmcyn</div>

          {/* centre: content block matching the live overlay */}
          <div className={styles.content}>
            <div className={styles.container}>
              <div className={styles.header}>
                <h2 className={styles.title}>{shareMetadata.title}</h2>
              </div>

              {(shareMetadata.createdAt || shareMetadata.campaign) && (
                <div className={styles.metadata}>
                  {shareMetadata.createdAt && (
                    <div className={styles.metadataRow}>
                      <span className={styles.label}>printed:</span>
                      <span className={styles.value}>{formatDate(shareMetadata.createdAt)}</span>
                    </div>
                  )}
                  {shareMetadata.campaign && (
                    <div className={styles.metadataRow}>
                      <span className={styles.label}>campaign:</span>
                      <span className={styles.value}>{shareMetadata.campaign}</span>
                    </div>
                  )}
                </div>
              )}

              {shareMetadata.description && shareMetadata.description.trim() && (
                <p className={styles.description}>{shareMetadata.description}</p>
              )}

              {shareMetadata.ctaLabel && (
                <div className={styles.cta}>{shareMetadata.ctaLabel}</div>
              )}
            </div>
          </div>

          {/* bottom: scan hint */}
          <div className={styles.footer}>
            <p className={styles.scanHint}>scan to experience in AR</p>
            <p className={styles.shareUrl}>{shareMetadata.shareUrl}</p>
          </div>
        </div>
      </div>
    );
  }
);

ARShareCard.displayName = 'ARShareCard';

export default ARShareCard;
