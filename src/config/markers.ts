export interface ProductMetadata {
  id: string;
  title: string;
  description?: string;
  printDate: string;
  printLocation: string;
  quantity: number;
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
  patternUrl?: string; // optional for nft markers
  modelUrl: string;
  scale?: number;
  label?: string;
  metadata?: ProductMetadata | ARSessionMetadata;
  onFound?: () => void;
  markerType?: 'pattern' | 'nft'; // pattern for .patt files, nft for image-based tracking
  mindTargetSrc?: string; // path to .mind file for MindAR image tracking (only for nft type)
}

export const DEFAULT_MINDAR_TARGET_URL = '/patterns/wmcyn-full-hq-banner.mind'; // mindar compiled target

export const markerConfigs: MarkerConfig[] = [
  // wmcyn monogram hoodie (sample) - active (prioritized first)
  {
    name: 'wmcyn-hoodie-monogram',
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.5,
    markerType: 'nft',
    mindTargetSrc: '/patterns/wmcyn-ar-marker-black.mind',
    label: 'wmcyn ar experience',
    metadata: {
      id: 'wmcyn-hoodie-001',
      title: 'wmcyn monogram hoodie (sample)',
      description: 'premium hoodie with wmcyn monogram design',
      printDate: '2025-12-22',
      printLocation: 'raleigh, nc',
      quantity: 1,
      price: {
        amount: 'priceless',
        currencyCode: 'USD'
      },
      isClaimed: false
    }
  },

  // wmcyn hq office banner - active
  {
    name: 'wmcyn-hq-banner',
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.5,
    markerType: 'nft',
    mindTargetSrc: DEFAULT_MINDAR_TARGET_URL,
    label: 'wmcyn ar experience',
    metadata: {
      id: 'wmcyn-banner-001',
      title: 'wmcyn hq office banner',
      description: 'official wmcyn headquarters office banner',
      printDate: '2025-12-19',
      printLocation: 'atlanta, ga',
      quantity: 1,
      price: {
        amount: 'priceless',
        currencyCode: 'USD'
      },
      isClaimed: false
    }
  },

  // wmcyn holographic tote - commented out for later
  // {
  //   name: 'wmcyn-tote',
  //   modelUrl: '/models/wmcyn_3d_logo.glb',
  //   scale: 0.4,
  //   markerType: 'nft',
  //   mindTargetSrc: '/patterns/wmcyn-tote.mind',
  //   label: 'wmcyn ar experience',
  //   metadata: {
  //     id: 'wmcyn-tote-001',
  //     title: 'wmcyn holographic tote',
  //     description: 'premium canvas tote bag with embroidered wmcyn logo',
  //     printDate: '2025-04-18',
  //     printLocation: 'atlanta, ga',
  //     quantity: 1,
  //     price: {
  //       amount: 'priceless',
  //       currencyCode: 'USD'
  //     },
  //     isClaimed: false
  //   }
  // },
]; 