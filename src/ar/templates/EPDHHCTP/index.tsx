import ARCamera from '@/components/ARCamera';
import type { MarkerConfig } from '@/config/markers';

interface WmcynxmasteeARProps {
  onClose?: () => void;
  meta?: {
    title?: string;
    description?: string;
    actions?: Array<{ type: string; label: string; url?: string }>;
    createdAt?: string;  // for "printed on" display
    campaign?: string;   // for campaign display
  };
  mindTargetSrc?: string; // custom .mind file URL from backend
}

export const WmcynxmasteeAR = ({ 
  onClose,
  meta,
  mindTargetSrc
}: WmcynxmasteeARProps): JSX.Element => {
  console.log('[WmcynxmasteeAR] Rendering with:', { 
    mindTargetSrc,
    hasMeta: !!meta,
    meta: meta,
    metaTitle: meta?.title,
    metaDescription: meta?.description
  });

  // if custom .mind file provided, create config for it
  // otherwise pass undefined to use default markerConfigs (like homepage)
  const customConfigs: MarkerConfig[] | undefined = mindTargetSrc ? [{
    name: 'EPDHHCTP_marker',
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.5,
    markerType: 'nft' as const,
    mindTargetSrc: mindTargetSrc,
    label: meta?.title || 'wmcyn xmas tee',
  }] : undefined;

  return (
    <ARCamera 
      onClose={onClose}
      configs={customConfigs}
      meta={meta}
    />
  );
};

export default WmcynxmasteeAR;
