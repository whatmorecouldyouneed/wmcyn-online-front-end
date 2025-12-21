// re-export ARCamera with QR-specific props for backwards compatibility
import React, { useMemo } from 'react';
import ARCamera from './ARCamera';
import { type MarkerConfig } from '../config/markers';
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
  };
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
}: ARCameraQRProps): JSX.Element => {
  
  // determine if this is an nft/mind marker
  const isNFT = markerType === 'nft' || markerType === 'mind';
  
  // convert overlays to marker configs
  const configs: MarkerConfig[] = useMemo(() => {
    return overlays.map((overlay, index) => ({
      name: `${markerType}_overlay_${index}`,
      patternUrl: isNFT ? undefined : markerDataUrl,
      modelUrl: overlay.src || '/models/wmcyn_3d_logo.glb',
      scale: overlay.scale ? overlay.scale[0] : 0.3,
      label: meta?.title || overlay.text || `AR Overlay ${index + 1}`,
      markerType: isNFT ? 'nft' as const : 'pattern' as const,
      mindTargetSrc: isNFT ? (mindTargetSrc || markerDataUrl) : undefined,
      onFound: onMarkerFound
    }));
  }, [overlays, markerDataUrl, markerType, meta?.title, onMarkerFound, isNFT, mindTargetSrc]);

  console.log('[ARCameraQR] Creating configs:', { markerType, isNFT, mindTargetSrc, configCount: configs.length });

  return (
    <ARCamera
      configs={configs}
      onClose={onClose}
      meta={meta}
    />
  );
};

export default ARCameraQR;
