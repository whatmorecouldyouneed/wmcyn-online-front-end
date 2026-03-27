export interface ProductMetadata {
  id: string;
  title: string;
  description?: string;
  printDate: string;
  printLocation: string;
  quantity: number;
  editionNumber?: number; // which piece this is, e.g. 1 of 3 → editionNumber: 1, quantity: 3
  price: {
    amount: string;
    currencyCode: string;
  };
  isClaimed: boolean;
  claimedBy?: string;
  claimedAt?: string;
}

import { ARSessionMetadata } from '../types/arSessions';

export interface MarkerConfig {
  name: string;
  patternUrl?: string; // optional for nft markers, can be a local path or a special identifier
  modelUrl: string;
  scale?: number;
  yOffset?: number; // per-marker y position override; falls back to MODEL_Y_OFFSET in useARScene
  label?: string;
  metadata?: ProductMetadata | ARSessionMetadata;
  onFound?: () => void;
  markerType?: 'pattern' | 'nft'; // pattern for .patt files, nft for image-based tracking
  mindTargetSrc?: string; // path to .mind file for MindAR image tracking (only for nft type)
}

export const DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER = 'USE_DEFAULT_HIRO_PATTERN';
export const DEFAULT_MINDAR_TARGET_URL = '/patterns/wmcyn-full-hq-banner-local.mind'; // local copy - avoids onedrive files-on-demand reparse point issues

export const markerConfigs: MarkerConfig[] = [
  // wmcyn hq office banner - the only active scan target
  {
    name: 'wmcyn-hq-banner',
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.5,
    markerType: 'nft',
    mindTargetSrc: DEFAULT_MINDAR_TARGET_URL,
    label: 'wmcyn ar experience',
    metadata: {
      id: 'wmcyn-banner-001',
      title: 'wmcyn headquarters office banner',
      description: 'official wmcyn headquarters office banner',
      printDate: '2025-12-19',
      printLocation: 'atlanta, ga',
      quantity: 1,
      editionNumber: 1,
      price: {
        amount: 'priceless',
        currencyCode: 'USD'
      },
      isClaimed: true,
    }
  },
];

// og apparel markers — not in default markerConfigs; product pages load these individually
export const wmcynOgTeeMarker: MarkerConfig = {
  name: 'wmcyn-og-tee',
  modelUrl: '/models/wmcyn_3d_logo.glb',
  scale: 1.2,
  yOffset: -1.5,
  markerType: 'nft',
  mindTargetSrc: '/patterns/wmcyn-og-tee.mind',
  label: 'wmcyn ar experience',
  metadata: {
    id: 'wmcyn-og-tee-001',
    title: 'wmcyn og long sleeve tee',
    description: 'white long sleeve with black wmcyn logo',
    printDate: '2026-03-27',
    printLocation: 'atlanta, ga',
    quantity: 1,
    price: {
      amount: '$20.00',
      currencyCode: 'USD',
    },
    isClaimed: true,
  },
};

export const wmcynOgHoodieMarker: MarkerConfig = {
  name: 'wmcyn-og-hoodie',
  modelUrl: '/models/wmcyn_3d_logo.glb',
  scale: 1.2,
  yOffset: -1.5,
  markerType: 'nft',
  mindTargetSrc: '/patterns/wmcyn-og-hoodie.mind',
  label: 'wmcyn ar experience',
  metadata: {
    id: 'wmcyn-og-hoodie-001',
    title: 'wmcyn og hoodie',
    description: 'heather grey hoodie with black accent wmcyn branding final sample',
    printDate: '2026-03-27',
    printLocation: 'atlanta, ga',
    quantity: 1,
    price: {
      amount: '$30.00',
      currencyCode: 'USD',
    },
    isClaimed: true,
  },
};