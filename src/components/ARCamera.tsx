import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { type MarkerConfig, markerConfigs as defaultMarkerConfigs } from '../config/markers';
import { useARScene } from '../hooks/useARScene';
import ARMetadataOverlay from './ARMetadataOverlay';
import { shareARSceneToInstagram } from '../utils/instagramSharing';
import styles from './ARCamera.module.scss';

interface ARCameraProps {
  onClose?: () => void;
  configs?: MarkerConfig[];
  // props for qr code / api-based ar experiences
  meta?: {
    title?: string;
    description?: string;
    actions?: Array<{ type: string; label: string; url?: string }>;
  };
}

const ARCamera = ({ onClose, configs, meta }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMarker, setDetectedMarker] = useState<MarkerConfig | null>(null);

  // use provided configs or default marker configs
  const effectiveConfigs = configs || defaultMarkerConfigs;

  // log loading state changes
  useEffect(() => {
    console.log('ARCamera: Loading state changed to:', isLoading);
  }, [isLoading]);

  // marker detection callback - show overlay
  const handleMarkerFound = useCallback((config: MarkerConfig) => {
    console.log(`Marker detected: ${config.name}`);
    setDetectedMarker(config);
    config.onFound?.();
  }, []);

  // create configs with detection callbacks
  const configsWithCallbacks = useMemo(() => 
    effectiveConfigs.map(config => ({
      ...config,
      onFound: () => handleMarkerFound(config)
    })),
    [effectiveConfigs, handleMarkerFound]
  );

  // use ar scene hook
  useARScene({ mountRef, configs: configsWithCallbacks, setIsLoading });

  // body class management for fullscreen
  useEffect(() => {
    document.body.classList.add('cameraActive');
    document.documentElement.classList.add('cameraActive');
    
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
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
    
    window.scrollTo(0, 1);
    
    const handleOrientationChange = () => {
      setTimeout(() => {
        window.scrollTo(0, 1);
        if (mountRef.current) {
          window.dispatchEvent(new Event('resize'));
        }
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      document.body.classList.remove('cameraActive');
      document.documentElement.classList.remove('cameraActive');
      
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

  // get metadata from detected marker or from meta prop
  const overlayMetadata = useMemo(() => {
    // priority: detected marker metadata > meta prop > null
    if (detectedMarker?.metadata) {
      return detectedMarker.metadata;
    }
    if (meta) {
      return {
        title: meta.title || 'WMCYN AR Experience',
        description: meta.description || '',
        actions: meta.actions?.map(a => ({
          type: a.type as 'purchase' | 'share' | 'claim' | 'info',
          label: a.label,
          url: a.url
        })) || []
      };
    }
    return null;
  }, [detectedMarker?.metadata, meta]);

  // action handlers
  const handleClaim = () => {
    if (overlayMetadata) {
      const metadata = overlayMetadata as any;
      console.log('Claiming product:', metadata.id || metadata.title);
    }
  };

  const handlePurchase = () => {
    if (overlayMetadata) {
      const metadata = overlayMetadata as any;
      console.log('Purchasing product:', metadata.id || metadata.title);
    }
  };

  const handleShare = async () => {
    if (overlayMetadata) {
      const metadata = overlayMetadata as any;
      console.log('Sharing product:', metadata.id || metadata.title);
      
      try {
        const videoElement = mountRef.current?.querySelector('video') as HTMLVideoElement;
        const canvasElement = mountRef.current?.querySelector('canvas') as HTMLCanvasElement;
        
        await shareARSceneToInstagram({
          metadata: {
            id: metadata.id || metadata.title,
            title: metadata.title,
            price: metadata.price,
            printLocation: metadata.printLocation,
            quantity: metadata.quantity
          },
          videoElement,
          canvasElement
        });
      } catch (error) {
        console.error('Error sharing to Instagram:', error);
        if (navigator.share) {
          navigator.share({ 
            title: metadata.title || 'WMCYN AR', 
            url: window.location.href 
          });
        } else {
          navigator.clipboard?.writeText(window.location.href);
          alert('Link copied!');
        }
      }
    }
  };

  const handleAction = (action: { type: string; label: string; url?: string }) => {
    if (action.url) {
      window.open(action.url, '_blank');
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

      {/* metadata overlay - show when we have metadata and not loading */}
      {!isLoading && overlayMetadata && (
        <ARMetadataOverlay
          metadata={overlayMetadata}
          isVisible={true}
          onClaim={handleClaim}
          onPurchase={handlePurchase}
          onShare={handleShare}
          onAction={handleAction}
        />
      )}
      
      {onClose && (
        <button 
          onClick={onClose} 
          className={styles.closeButton}
        >
          Close AR
        </button>
      )}
    </div>
  );
};

export default ARCamera;
