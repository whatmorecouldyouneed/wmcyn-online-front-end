import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useARScene } from '../hooks/useARScene';
import { type MarkerConfig } from '../config/markers';
import type { ResolvedOverlay } from '@/types/arSessions';
import styles from './ARCamera.module.scss';

interface ARCameraQRProps {
  markerType: 'custom' | 'hiro' | 'kanji';
  markerDataUrl: string;
  overlays: ResolvedOverlay[];
  onMarkerFound?: () => void;
  onMarkerLost?: () => void;
  onClose?: () => void;
  qrCode?: string; // QR code for template lookup
}

const ARCameraQR = ({ 
  markerType, 
  markerDataUrl, 
  overlays, 
  onMarkerFound, 
  onMarkerLost,
  onClose,
  qrCode
}: ARCameraQRProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMarker, setDetectedMarker] = useState<boolean>(false);
  // convert overlays to marker configs for useARScene
  const markerConfigs: MarkerConfig[] = useMemo(() => {
    return overlays.map((overlay, index) => ({
      name: `${markerType}_overlay_${index}`,
      patternUrl: markerDataUrl,
      modelUrl: overlay.src || '/models/wmcyn_3d_logo.glb', // fallback to default logo
      scale: overlay.scale ? overlay.scale[0] : 0.3, // use first scale component
      label: overlay.text || `AR Overlay ${index + 1}`,
      onFound: () => {
        if (!detectedMarker) {
          setDetectedMarker(true);
          onMarkerFound?.();
        }
      }
    }));
  }, [overlays, markerDataUrl, markerType, detectedMarker, onMarkerFound]);

  // use the existing ar scene hook
  useARScene({ mountRef, configs: markerConfigs, setIsLoading });

  // handle marker lost detection
  const handleMarkerLost = useCallback(() => {
    if (detectedMarker) {
      setDetectedMarker(false);
      onMarkerLost?.();
    }
  }, [detectedMarker, onMarkerLost]);

  // useEffect for body class management and mobile fullscreen (reuse from ARCamera)
  React.useEffect(() => {
    console.log('ARCameraQR: Adding cameraActive classes and applying body styles');
    document.body.classList.add('cameraActive');
    document.documentElement.classList.add('cameraActive');
    
    // prevent mobile browser ui from showing during ar experience
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // store original styles to restore later
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
    
    // force full viewport coverage
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
    
    // hide mobile browser ui
    window.scrollTo(0, 1);
    
    // handle orientation changes
    const handleOrientationChange = () => {
      setTimeout(() => {
        window.scrollTo(0, 1);
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
      
      // restore original styles
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

  return (
    <div className={styles.arCameraContainer}>
      <div ref={mountRef} className={styles.mountPoint}></div>
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          Initializing AR...
        </div>
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

export default ARCameraQR;
