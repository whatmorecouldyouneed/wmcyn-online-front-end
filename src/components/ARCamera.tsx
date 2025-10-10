import React, { useRef, useState, useCallback, useMemo } from 'react';
import { type MarkerConfig, markerConfigs as defaultMarkerConfigs } from '../config/markers';
import { useARScene } from '../hooks/useARScene';
import ARMetadataOverlay from './ARMetadataOverlay';
import ARTestOverlay from './ARTestOverlay';
import FPSCounter from './FPSCounter';
import { shareARSceneToInstagram } from '../utils/instagramSharing';
import styles from './ARCamera.module.scss'; 

interface ARCameraProps {
  onClose: () => void;
  configs?: MarkerConfig[];
}

const ARCamera = ({ onClose, configs = defaultMarkerConfigs }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMarker, setDetectedMarker] = useState<MarkerConfig | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  
  // refs for managing metadata timing
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  // Log loading state changes to debug layout shifts
  React.useEffect(() => {
    console.log('ARCamera: Loading state changed to:', isLoading);
  }, [isLoading]);

  // Enhanced product detection callback with smooth timing
  const handleProductDetected = useCallback((config: MarkerConfig) => {
    const now = Date.now();
    lastDetectionTimeRef.current = now;
    
    console.log(`🎯 Product detected: ${config.name} (${config.metadata.title})`);
    
    // Show metadata immediately if not already shown
    if (!showMetadata) {
      setDetectedMarker(config);
      setShowMetadata(true);
    } else if (detectedMarker?.name !== config.name) {
      // Switch to new product if different
      setDetectedMarker(config);
    }
    
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Set new hide timeout for 5 seconds after last detection
    hideTimeoutRef.current = setTimeout(() => {
      // Only hide if no recent detections
      if (Date.now() - lastDetectionTimeRef.current >= 5000) {
        console.log('📱 hiding metadata after 5 seconds of no detection');
        setShowMetadata(false);
        setTimeout(() => {
          setDetectedMarker(null);
        }, 300); // slightly longer fade for smoother UX
      }
    }, 5000);
    
  }, [showMetadata, detectedMarker]);

  // Test product handler for development
  const handleTestProduct = useCallback((productId: string) => {
    const config = configs.find(c => c.name === productId);
    if (config) {
      console.log(`🧪 Testing product: ${productId}`);
      handleProductDetected(config);
    }
  }, [configs, handleProductDetected]);

  // use the custom hook for AR scene management with product detection
  useARScene({ 
    mountRef, 
    configs, // use simplified configs (no onFound handlers needed)
    setIsLoading,
    onProductDetected: handleProductDetected
  });

  // useEffect for body class management and mobile fullscreen
  React.useEffect(() => {
    console.log('ARCamera: Adding cameraActive classes and applying body styles');
    document.body.classList.add('cameraActive');
    document.documentElement.classList.add('cameraActive');
    
    // Prevent mobile browser UI from showing during AR experience and fix layout
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // Store original styles to restore later
    const originalStyles = {
      htmlOverflow: htmlElement.style.overflow,
      htmlWidth: htmlElement.style.width,
      htmlHeight: htmlElement.style.height,
      bodyOverflow: bodyElement.style.overflow,
      bodyPosition: bodyElement.style.position,
      bodyWidth: bodyElement.style.width,
      bodyHeight: bodyElement.style.height,
      bodyLeft: bodyElement.style.left,
      bodyTop: bodyElement.style.top,
      bodyMargin: bodyElement.style.margin,
      bodyPadding: bodyElement.style.padding
    };
    
    // Force full viewport coverage on both html and body
    htmlElement.style.overflow = 'hidden';
    htmlElement.style.width = '100vw';
    htmlElement.style.height = '100vh';
    
    bodyElement.style.overflow = 'hidden';
    bodyElement.style.position = 'fixed';
    bodyElement.style.width = '100vw';
    bodyElement.style.height = '100vh';
    bodyElement.style.left = '0';
    bodyElement.style.top = '0';
    bodyElement.style.margin = '0';
    bodyElement.style.padding = '0';
    
    // Hide mobile browser UI by scrolling and using meta viewport
    window.scrollTo(0, 1);
    
    // Handle orientation changes for fullscreen and resize
    const handleOrientationChange = () => {
      setTimeout(() => {
        window.scrollTo(0, 1);
        // Force resize of AR elements
        if (mountRef.current) {
          const event = new Event('resize');
          window.dispatchEvent(event);
        }
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      document.body.classList.remove('cameraActive');
      document.documentElement.classList.remove('cameraActive');
      
      // Clean up metadata timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      // Restore original styles
      const htmlElement = document.documentElement;
      const bodyElement = document.body;
      
      htmlElement.style.overflow = originalStyles.htmlOverflow;
      htmlElement.style.width = originalStyles.htmlWidth;
      htmlElement.style.height = originalStyles.htmlHeight;
      
      bodyElement.style.overflow = originalStyles.bodyOverflow;
      bodyElement.style.position = originalStyles.bodyPosition;
      bodyElement.style.width = originalStyles.bodyWidth;
      bodyElement.style.height = originalStyles.bodyHeight;
      bodyElement.style.left = originalStyles.bodyLeft;
      bodyElement.style.top = originalStyles.bodyTop;
      bodyElement.style.margin = originalStyles.bodyMargin;
      bodyElement.style.padding = originalStyles.bodyPadding;
      
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // handlers for metadata actions
  const handleClaim = () => {
    if (detectedMarker?.metadata) {
      console.log('Claiming product:', detectedMarker.metadata.id);
      // todo: implement claim logic
    }
  };

  const handlePurchase = () => {
    if (detectedMarker?.metadata) {
      console.log('Purchasing product:', detectedMarker.metadata.id);
      // todo: implement purchase logic
    }
  };

  const handleShare = async () => {
    if (detectedMarker?.metadata) {
      console.log('Sharing product:', detectedMarker.metadata.id);
      
      try {
        // find video and canvas elements for capture
        const videoElement = mountRef.current?.querySelector('video') as HTMLVideoElement;
        const canvasElement = mountRef.current?.querySelector('canvas') as HTMLCanvasElement;
        
        await shareARSceneToInstagram({
          metadata: {
            id: detectedMarker.metadata.id,
            title: detectedMarker.metadata.title,
            price: detectedMarker.metadata.price,
            printLocation: detectedMarker.metadata.printLocation,
            quantity: detectedMarker.metadata.quantity
          },
          videoElement,
          canvasElement
        });
      } catch (error) {
        console.error('Error sharing to Instagram:', error);
        alert('Failed to share to Instagram. Please try again.');
      }
    }
  };

  return (
    <div className={styles.arCameraContainer}>
      <div ref={mountRef} className={styles.mountPoint}></div>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          Initializing AR...
        </div>
      )}

      {/* AR Metadata Overlay */}
      {detectedMarker?.metadata && (
        <ARMetadataOverlay
          metadata={detectedMarker.metadata}
          isVisible={showMetadata}
          onClaim={handleClaim}
          onPurchase={handlePurchase}
          onShare={handleShare}
        />
      )}
      
      {/* FPS Counter - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <FPSCounter isVisible={true} />
      )}

      {/* Test Mode Overlay - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <ARTestOverlay 
          onTestProduct={handleTestProduct}
          videoElement={mountRef.current?.querySelector('video') as HTMLVideoElement}
        />
      )}
      
      <button 
        onClick={onClose} 
        className={styles.closeButton}
      >
        Close AR
      </button>
    </div>
  );
};

export default ARCamera;
