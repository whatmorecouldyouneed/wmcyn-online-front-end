import React, { useRef, useState } from 'react';
import { type MarkerConfig, markerConfigs as defaultMarkerConfigs } from '../config/markers';
import { useARScene } from '../hooks/useARScene';
import styles from './ARCamera.module.scss';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../utils/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import ProductMetadataDisplay from './ProductMetadataDisplay';

interface ARCameraProps {
  onClose: () => void;
  configs?: MarkerConfig[];
}

const ARCamera = ({ onClose, configs = defaultMarkerConfigs }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProductMetadata, setShowProductMetadata] = useState(false);
  const [detectedMarkerConfig, setDetectedMarkerConfig] = useState<MarkerConfig | null>(null);
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const { currentUser, googleSignIn } = useAuth();

  const enhancedConfigs = configs.map(config => ({
    ...config,
    onFound: async () => {
      // Show 3D logo animation first
      setDetectedMarkerConfig(config);
      setShowLogoAnimation(true);
      
      // Wait for logo animation to play, then show metadata
      setTimeout(() => {
        setShowLogoAnimation(false);
        setShowProductMetadata(true);
      }, 3000); // 3 seconds for logo animation
    }
  }));

  // use the custom hook for AR scene management
  useARScene({ mountRef, configs: enhancedConfigs, setIsLoading });

  // useEffect for body class management
  React.useEffect(() => {
    document.body.classList.add('cameraActive');
    return () => {
      document.body.classList.remove('cameraActive');
    };
  }, []);

  const handleClaimProduct = async () => {
    if (!detectedMarkerConfig) return;

    if (!currentUser) {
      // Trigger login flow
      try {
        await googleSignIn();
        // After successful login, the user can try claiming again
        return;
      } catch (error) {
        console.error('Login failed:', error);
        alert('Failed to log in. Please try again.');
        return;
      }
    }

    if (!firestore) {
      alert('Database not initialized.');
      return;
    }

    setIsProcessingClaim(true);

    try {
      const markerRef = doc(firestore, 'markers', detectedMarkerConfig.productId);
      const markerSnap = await getDoc(markerRef);
      
      if (!markerSnap.exists()) {
        // Product is available - claim it
        await setDoc(markerRef, { 
          owner: currentUser.uid, 
          claimedAt: new Date(),
          productMetadata: detectedMarkerConfig.productMetadata
        });
        
        // Add to user's collection
        await setDoc(doc(firestore, `users/${currentUser.uid}/products`, detectedMarkerConfig.productId), {
          name: detectedMarkerConfig.productMetadata.title,
          acquired: new Date(),
          metadata: detectedMarkerConfig.productMetadata
        });
        
        alert(`${detectedMarkerConfig.productMetadata.title} claimed successfully! Check your dashboard to see your collection.`);
        
        // Close the product metadata display after successful claim
        setShowProductMetadata(false);
        setDetectedMarkerConfig(null);
      } else {
        // Product already claimed
        const ownerData = markerSnap.data();
        if (ownerData.owner === currentUser.uid) {
          alert('You have already claimed this item!');
        } else {
          alert('This product has already been claimed by another user.');
        }
      }
    } catch (error) {
      console.error('Error claiming product:', error);
      alert('Failed to claim product. Please try again.');
    } finally {
      setIsProcessingClaim(false);
    }
  };

  const handleCloseMetadata = () => {
    setShowProductMetadata(false);
    setDetectedMarkerConfig(null);
    setShowLogoAnimation(false);
  };

  return (
    <div className={styles.arCameraContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          <p>Initializing AR Scanner...</p>
        </div>
      )}
      
      <div ref={mountRef} className={styles.mountPoint}></div>
      
      {/* Scanning instructions */}
      {!isLoading && !showProductMetadata && !showLogoAnimation && (
        <div className={styles.instructionsOverlay}>
          <div className={styles.scanningFrame}>
            <div className={styles.frameCorners}></div>
            <p className={styles.instructionText}>
              Point your camera at a WMCYN marker to scan
            </p>
          </div>
        </div>
      )}

      {/* 3D Logo Animation Overlay */}
      {showLogoAnimation && detectedMarkerConfig && (
        <div className={styles.logoAnimationOverlay}>
          <div className={styles.logoAnimationContent}>
            <div className={styles.logoContainer}>
              <img 
                src={detectedMarkerConfig.productMetadata.imageUrl}
                alt={detectedMarkerConfig.productMetadata.title}
                className={styles.animatedLogo}
              />
              <div className={styles.glowEffect}></div>
            </div>
            <h2 className={styles.animationTitle}>3D Logo Detected!</h2>
            <p className={styles.animationSubtitle}>Loading product details...</p>
          </div>
        </div>
      )}

      {/* Product Metadata Display */}
      {showProductMetadata && detectedMarkerConfig && (
        <ProductMetadataDisplay
          metadata={detectedMarkerConfig.productMetadata}
          onClose={handleCloseMetadata}
          onClaim={handleClaimProduct}
          isLoggedIn={!!currentUser}
          showLogoAnimation={false} // We already showed it in the AR overlay
        />
      )}

      {/* Close AR Button */}
      <button
        onClick={onClose}
        className={styles.closeButton}
        disabled={isProcessingClaim}
      >
        {isProcessingClaim ? 'Processing...' : 'Close AR'}
      </button>

      {/* User status indicator */}
      {!isLoading && (
        <div className={styles.userStatus}>
          {currentUser ? (
            <span className={styles.loggedIn}>
              ✓ Logged in as {currentUser.displayName || currentUser.email}
            </span>
          ) : (
            <span className={styles.loggedOut}>
              ⚠ Not logged in - claims require login
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ARCamera;
