import React from 'react';
import { ProductMetadata } from '../config/markers';
import { ARSessionMetadata } from '../types/arSessions';
import styles from './ARMetadataOverlay.module.scss';

interface ARMetadataOverlayProps {
  metadata: ProductMetadata | ARSessionMetadata;
  isVisible: boolean;
  onClaim?: () => void;
  onShare?: () => void;
  onPurchase?: () => void;
  onAction?: (action: { type: string; label: string; url?: string }) => void;
}

const ARMetadataOverlay: React.FC<ARMetadataOverlayProps> = ({
  metadata,
  isVisible,
  onClaim,
  onShare,
  onPurchase,
  onAction
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

  // check if this is ar session metadata with dynamic actions
  const isARSessionMetadata = 'actions' in metadata && Array.isArray(metadata.actions);
  const arSessionMetadata = isARSessionMetadata ? metadata as ARSessionMetadata : null;
  const productMetadata = !isARSessionMetadata ? metadata as ProductMetadata : null;

  const handleAction = (action: { type: string; label: string; url?: string }) => {
    if (action.url) {
      // open url in new tab
      window.open(action.url, '_blank');
    }
    onAction?.(action);
  };

  return (
    <div className={`${styles.overlay} ${!isVisible ? styles.fadeOut : ''}`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>{metadata.title}</h3>
          {productMetadata && (
            <div className={styles.status}>
              {productMetadata.isClaimed ? (
                <span className={styles.claimed}>✓ claimed</span>
              ) : (
                <span className={styles.available}>● available</span>
              )}
            </div>
          )}
        </div>
        
        {productMetadata && (
          <div className={styles.metadata}>
            <div className={styles.metadataRow}>
              <span className={styles.label}>printed:</span>
              <span className={styles.value}>{formatDate(productMetadata.printDate)}</span>
            </div>
            
            <div className={styles.metadataRow}>
              <span className={styles.label}>location:</span>
              <span className={styles.value}>{productMetadata.printLocation}</span>
            </div>
            
            <div className={styles.metadataRow}>
              <span className={styles.label}>edition:</span>
              <span className={styles.value}>{productMetadata.quantity} pieces</span>
            </div>
            
            <div className={styles.metadataRow}>
              <span className={styles.label}>price:</span>
              <span className={styles.value}>
                {formatPrice(productMetadata.price.amount, productMetadata.price.currencyCode)}
              </span>
            </div>
          </div>
        )}

        {metadata.description && (
          <p className={styles.description}>{metadata.description}</p>
        )}
        
        <div className={styles.actions}>
          {arSessionMetadata ? (
            // dynamic actions from ar session
            arSessionMetadata.actions.map((action, index) => (
              <button
                key={index}
                className={
                  action.type === 'purchase' ? styles.purchaseButton :
                  action.type === 'claim' ? styles.claimButton :
                  action.type === 'share' ? styles.shareButton :
                  styles.infoButton
                }
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            ))
          ) : productMetadata ? (
            // legacy product metadata actions
            <>
              {!productMetadata.isClaimed && onClaim && (
                <button className={styles.claimButton} onClick={onClaim}>
                  claim
                </button>
              )}
              
              <button className={styles.purchaseButton} disabled>
                buy {formatPrice(productMetadata.price.amount, productMetadata.price.currencyCode)}
              </button>
              
              {onShare && (
                <button className={styles.shareButton} onClick={onShare}>
                  📸
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ARMetadataOverlay;