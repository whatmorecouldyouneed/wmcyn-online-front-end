import React from 'react';
import { ProductMetadata } from '../config/markers';
import styles from './ARMetadataOverlay.module.scss';

interface ARMetadataOverlayProps {
  metadata: ProductMetadata;
  isVisible: boolean;
  onClaim?: () => void;
  onShare?: () => void;
  onPurchase?: () => void;
}

const ARMetadataOverlay: React.FC<ARMetadataOverlayProps> = ({
  metadata,
  isVisible,
  onClaim,
  onShare,
  onPurchase
}) => {
  const formatPrice = (amount: string, currency: string) => {
    return `${currency === 'USD' ? '$' : currency}${amount}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (!metadata) return null;

  return (
    <div className={`${styles.overlay} ${!isVisible ? styles.fadeOut : ''}`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>{metadata.title}</h3>
          <div className={styles.status}>
            {metadata.isClaimed ? (
              <span className={styles.claimed}>✓ claimed</span>
            ) : (
              <span className={styles.available}>● available</span>
            )}
          </div>
        </div>
        
        <div className={styles.metadata}>
          <div className={styles.metadataRow}>
            <span className={styles.label}>printed:</span>
            <span className={styles.value}>{formatDate(metadata.printDate)}</span>
          </div>
          
          <div className={styles.metadataRow}>
            <span className={styles.label}>location:</span>
            <span className={styles.value}>{metadata.printLocation}</span>
          </div>
          
          <div className={styles.metadataRow}>
            <span className={styles.label}>edition:</span>
            <span className={styles.value}>{metadata.quantity} pieces</span>
          </div>
          
          <div className={styles.metadataRow}>
            <span className={styles.label}>price:</span>
            <span className={styles.value}>
              {formatPrice(metadata.price.amount, metadata.price.currencyCode)}
            </span>
          </div>
        </div>

        {metadata.description && (
          <p className={styles.description}>{metadata.description}</p>
        )}
        
        <div className={styles.actions}>
          {!metadata.isClaimed && onClaim && (
            <button className={styles.claimButton} onClick={onClaim}>
              claim
            </button>
          )}
          
          <button className={styles.purchaseButton} disabled>
            buy {formatPrice(metadata.price.amount, metadata.price.currencyCode)}
          </button>
          
          {onShare && (
            <button className={styles.shareButton} onClick={onShare}>
              📸
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARMetadataOverlay;