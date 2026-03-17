// re-export ARCamera with QR-specific props for backwards compatibility
import React, { useMemo } from 'react';
import ARCamera from './ARCamera';
import { type MarkerConfig, DEFAULT_MINDAR_TARGET_URL } from '../config/markers';
import type { ResolvedOverlay } from '@/types/arSessions';

interface ARCameraQRProps {
  markerType: 'custom' | 'hiro' | 'kanji' | 'nft' | 'mind';
  markerDataUrl: string;
  mindTargetSrc?: string;
  overlays: ResolvedOverlay[];
  onMarkerFound?: () => void;
  onMarkerLost?: () => void;
  onClose?: () => void;
  qrCode?: string;
  meta?: {
    title?: string;
    description?: string;
    actions?: Array<{ type: string; label: string; url?: string }>;
    createdAt?: string;
    campaign?: string;
  };
  // canonical share url for the story card and copy-link fallback
  shareUrl?: string;
}

// wrapper component that converts QR props to ARCamera props
const ARCameraQR = ({
  markerType,
  markerDataUrl,
  mindTargetSrc,
  overlays,
  onMarkerFound,
  onClose,
  meta,
  shareUrl,
}: ARCameraQRProps): JSX.Element => {
  const resolvedMindTarget = useMemo(() => {
    if (mindTargetSrc) return mindTargetSrc;
    if (typeof markerDataUrl === 'string' && /\.mind(\?|$)/i.test(markerDataUrl)) return markerDataUrl;
    // fall back to the wmcyn banner — the canonical primary mind target
    return DEFAULT_MINDAR_TARGET_URL;
  }, [mindTargetSrc, markerDataUrl]);

  const isNFT = markerType === 'nft' || markerType === 'mind';

  const configs: MarkerConfig[] = useMemo(() => {
    return overlays.map((overlay, index) => ({
      name: `${markerType}_overlay_${index}`,
      patternUrl: isNFT ? undefined : markerDataUrl,
      modelUrl: overlay.src || '/models/wmcyn_3d_logo.glb',
      scale: overlay.scale ? overlay.scale[0] : 0.3,
      label: meta?.title || overlay.text || `AR Overlay ${index + 1}`,
      markerType: isNFT ? ('nft' as const) : ('pattern' as const),
      mindTargetSrc: isNFT ? resolvedMindTarget : undefined,
      onFound: onMarkerFound,
    }));
  }, [overlays, markerDataUrl, markerType, meta?.title, onMarkerFound, isNFT, resolvedMindTarget]);

  console.log('[ARCameraQR] Creating configs:', {
    markerType,
    isNFT,
    resolvedMindTarget,
    configCount: configs.length,
  });

  return <ARCamera configs={configs} onClose={onClose} meta={meta} shareUrl={shareUrl} />;
};

export default ARCameraQR;
