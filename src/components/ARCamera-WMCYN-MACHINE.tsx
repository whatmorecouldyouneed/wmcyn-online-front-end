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
    createdAt?: string;  // for "printed on" display
    campaign?: string;   // for campaign display
  };
}

const ARCamera = ({ onClose, configs, meta }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMarker, setDetectedMarker] = useState<MarkerConfig | null>(null);

  // use provided configs or default marker configs
  const effectiveConfigs = configs || defaultMarkerConfigs;


  // marker detection callback - show overlay
  const handleMarkerFound = useCallback((config: MarkerConfig) => {
    setDetectedMarker(config);
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

  // get metadata from meta prop (preferred) or detected marker
  const overlayMetadata = useMemo(() => {
    // priority: meta prop (ar overlay settings) > detected marker metadata > null
    // meta prop contains the user-defined AR title/description from product set
    if (meta) {
      const result = {
        title: meta.title || 'WMCYN AR Experience',
        // preserve undefined if description not provided - don't use fallback
        description: meta.description,
        actions: meta.actions?.map(a => ({
          type: a.type as 'purchase' | 'share' | 'claim' | 'info',
          label: a.label,
          url: a.url
        })) || [],
        createdAt: meta.createdAt,  // pass through for "printed on" display
        campaign: meta.campaign      // pass through for campaign display
      };
      console.log('[ARCamera] overlayMetadata from meta prop:', result);
      return result;
    }
    // fallback to detected marker metadata if no meta prop (homepage flow)
    if (detectedMarker?.metadata) {
      console.log('[ARCamera] overlayMetadata from detected marker:', detectedMarker.metadata);
      return detectedMarker.metadata;
    }
    console.log('[ARCamera] No overlayMetadata available');
    return null;
  }, [meta, detectedMarker?.metadata]);

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

      {/* metadata overlay - show when marker detected OR when meta is provided (qr flows) */}
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
