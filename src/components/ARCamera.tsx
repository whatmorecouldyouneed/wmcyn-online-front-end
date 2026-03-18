import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { type MarkerConfig, markerConfigs as defaultMarkerConfigs } from '../config/markers';
import { useARScene } from '../hooks/useARScene';
import ARMetadataOverlay from './ARMetadataOverlay';
import ARShareCard from './ARShareCard';
import { buildShareMetadata, shareStoryCard } from '../utils/shareStoryCard';
import { shareARCapture } from '../utils/shareARCapture';
import styles from './ARCamera.module.scss';

interface ARCameraProps {
  onClose?: () => void;
  configs?: MarkerConfig[];
  // props for qr code / api-based ar experiences
  meta?: {
    title?: string;
    description?: string;
    actions?: Array<{ type: string; label: string; url?: string }>;
    createdAt?: string;
    campaign?: string;
  };
  // canonical share url for this experience — used in the story card and copy-link fallback
  shareUrl?: string;
}

const ARCamera = ({ onClose, configs, meta, shareUrl }: ARCameraProps): JSX.Element => {
  const mountRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMarker, setDetectedMarker] = useState<MarkerConfig | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showInteractHint, setShowInteractHint] = useState(false);
  const hasShownHintRef = useRef(false);

  // use provided configs or default marker configs
  const effectiveConfigs = configs || defaultMarkerConfigs;

  // marker detection callback - show overlay
  const handleMarkerFound = useCallback((config: MarkerConfig) => {
    setDetectedMarker(config);
  }, []);

  // create configs with detection callbacks
  const configsWithCallbacks = useMemo(
    () =>
      effectiveConfigs.map((config) => ({
        ...config,
        onFound: () => handleMarkerFound(config),
      })),
    [effectiveConfigs, handleMarkerFound]
  );

  // use ar scene hook — threeRef exposes renderer/scene/camera for share capture
  const { threeRef } = useARScene({ mountRef, configs: configsWithCallbacks, setIsLoading });

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
      bodyPadding: bodyElement.style.padding,
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

  // resolve metadata for the overlay (meta prop preferred, then detected marker)
  const overlayMetadata = useMemo(() => {
    if (meta) {
      return {
        title: meta.title || 'WMCYN AR Experience',
        description: meta.description,
        actions: meta.actions?.map((a) => ({
          type: a.type as 'purchase' | 'share' | 'claim' | 'info',
          label: a.label,
          url: a.url,
        })) || [],
        createdAt: meta.createdAt,
        campaign: meta.campaign,
      };
    }
    if (detectedMarker?.metadata) {
      return detectedMarker.metadata;
    }
    return null;
  }, [meta, detectedMarker?.metadata]);

  // derive the canonical share url — prefer the explicit prop, then current page
  const resolvedShareUrl = useMemo(() => {
    if (shareUrl) return shareUrl;
    if (typeof window !== 'undefined') return window.location.href;
    return 'https://wmcyn.online';
  }, [shareUrl]);

  // share metadata passed to the story card and share utility
  const shareMetadata = useMemo(
    () => buildShareMetadata(overlayMetadata as any, resolvedShareUrl),
    [overlayMetadata, resolvedShareUrl]
  );

  // auto-clear share status after 3 seconds
  useEffect(() => {
    if (!shareStatus) return;
    const timer = setTimeout(() => setShareStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [shareStatus]);

  // show the hint once, the first time a marker (or model) becomes visible
  useEffect(() => {
    if (!detectedMarker || hasShownHintRef.current) return;
    hasShownHintRef.current = true;
    setShowInteractHint(true);
  }, [detectedMarker]);

  // single share handler — used by both the legacy 📸 path and dynamic share actions.
  // primary path: composite the live ar view (video + webgl canvas + overlay strip).
  // fallback: export the hidden branded story card if live capture produces nothing.
  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    setShareStatus('capturing ar moment…');

    try {
      const result = await shareARCapture(
        mountRef.current,
        overlayMetadata as any,
        threeRef.current,
        shareMetadata,
        // fallback: render the static story card via html-to-image
        async () => {
          const { toBlob } = await import('html-to-image');
          await document.fonts.ready;
          const el = shareCardRef.current;
          if (!el) throw new Error('share card not mounted');
          const blob = await toBlob(el, {
            pixelRatio: 1,
            width: 1080,
            height: 1920,
            backgroundColor: '#0a0a0a',
            cacheBust: true,
          });
          if (!blob) throw new Error('html-to-image produced null');
          return blob;
        }
      );

      if (!result.success) {
        setShareStatus('error' in result ? result.error : 'could not share');
        return;
      }

      switch (result.method) {
        case 'native-share':
          setShareStatus('shared!');
          break;
        case 'download':
          setShareStatus('image saved — link copied too!');
          break;
        case 'copy-link':
          setShareStatus('link copied!');
          break;
      }
    } catch (err: any) {
      console.error('[ARCamera] share failed:', err?.message);
      setShareStatus('could not share — try again');
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, mountRef, overlayMetadata, threeRef, shareCardRef, shareMetadata]);

  // action handler passed to ARMetadataOverlay for non-share / non-url actions.
  // url opening is handled inside ARMetadataOverlay.handleAction itself so we
  // never open a url twice. share-typed actions are handled by ARMetadataOverlay
  // via onShare, so they never reach here.
  const handleAction = useCallback(
    (_action: { type: string; label: string; url?: string }) => {
      // intentionally a no-op — all routing is done in ARMetadataOverlay.handleAction
    },
    []
  );

  const handleClaim = useCallback(() => {
    const metadata = overlayMetadata as any;
    if (metadata) {
      console.log('Claiming product:', metadata.id || metadata.title);
    }
  }, [overlayMetadata]);

  const handlePurchase = useCallback(() => {
    const metadata = overlayMetadata as any;
    if (metadata) {
      console.log('Purchasing product:', metadata.id || metadata.title);
    }
  }, [overlayMetadata]);

  return (
    <div className={styles.arCameraContainer}>
      <div ref={mountRef} className={styles.mountPoint}></div>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          Initializing AR...
        </div>
      )}

      {/* metadata overlay — shown when marker detected or when meta is provided (qr flows) */}
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

      {/* one-time interactable hint — fades in then out via CSS animation */}
      {showInteractHint && (
        <div
          className={styles.interactHint}
          onAnimationEnd={() => setShowInteractHint(false)}
        >
          swipe to spin · pinch to scale
        </div>
      )}

      {/* share status toast */}
      {shareStatus && (
        <div className={styles.shareToast}>
          {isSharing && <span className={styles.shareSpinner} />}
          {shareStatus}
        </div>
      )}

      {onClose && (
        <button onClick={onClose} className={styles.closeButton}>
          Close AR
        </button>
      )}

      {/* hidden story card rendered offscreen — captured by html-to-image on share */}
      <div className={styles.shareCardOffscreen}>
        <ARShareCard ref={shareCardRef} shareMetadata={shareMetadata} />
      </div>
    </div>
  );
};

export default ARCamera;
