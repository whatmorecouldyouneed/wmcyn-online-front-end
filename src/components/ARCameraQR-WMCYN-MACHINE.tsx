// re-export ARCamera with QR-specific props for backwards compatibility
import React, { useMemo } from 'react';
import ARCamera from './ARCamera';
import { type MarkerConfig } from '../config/markers';
import type { ResolvedOverlay } from '@/types/arSessions';
import { validateMindARCompatibility } from '@/utils/markerSync';

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
  
  // convert overlays to marker configs with mindar validation
  const configs: MarkerConfig[] = useMemo(() => {
    return overlays.map((overlay, index) => {
      const config: MarkerConfig = {
        name: `${markerType}_overlay_${index}`,
        patternUrl: isNFT ? undefined : markerDataUrl,
        modelUrl: overlay.src || '/models/wmcyn_3d_logo.glb',
        scale: overlay.scale ? overlay.scale[0] : 0.3,
        label: meta?.title || overlay.text || `AR Overlay ${index + 1}`,
        markerType: isNFT ? 'nft' as const : 'pattern' as const,
        mindTargetSrc: isNFT ? (mindTargetSrc || markerDataUrl) : undefined,
        onFound: onMarkerFound
      };
      
      // validate mindar compatibility per public/patterns/README.md
      if (isNFT) {
        const validation = validateMindARCompatibility(config);
        if (!validation.isValid) {
          console.error(`[ARCameraQR] mindar validation errors for overlay ${index}:`, validation.errors);
        }
        if (validation.warnings.length > 0) {
          console.warn(`[ARCameraQR] mindar validation warnings for overlay ${index}:`, validation.warnings);
        }
      }
      
      return config;
    });
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
