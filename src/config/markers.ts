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
  patternUrl: string; // can be a local path or a special identifier
  modelUrl: string;
  scale?: number;
  label?: string;
  metadata?: ProductMetadata | ARSessionMetadata;
  onFound?: () => void;
}

export const DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER = 'USE_DEFAULT_HIRO_PATTERN';

export const markerConfigs: MarkerConfig[] = [
  {
    name: 'hiro',
    patternUrl: DEFAULT_HIRO_PATTERN_URL_PLACEHOLDER,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.3,
    metadata: {
      id: 'wmcyn-tote-001',
      title: 'wmcyn charred holographic logo tote (sample)',
      description: 'premium canvas tote bag with embroidered wmcyn logo',
      printDate: '2025-04-18',
      printLocation: 'atlanta, ga',
      quantity: 1,
      price: {
        amount: 'priceless',
        currencyCode: 'USD'
      },
      isClaimed: true,
      claimedBy: 'previous_user@example.com',
      claimedAt: '2025-07-27T10:30:00Z'
    }
  },

  // add new product entries here
  // example:
  // {
  //   name: 'product_xyz',
  //   patternUrl: '/patterns/product_xyz.patt', // local path
  //   modelUrl: '/models/product_xyz.glb',
  //   scale: 0.5,
  //   label: 'Product XYZ',
  //   metadata: {
  //     id: 'product-xyz-001',
  //     title: 'product xyz',
  //     printDate: '2024-02-01',
  //     printLocation: 'los angeles, ca',
  //     quantity: 25,
  //     price: { amount: '149.99', currencyCode: 'USD' },
  //     isClaimed: false
  //   },
  //   onFound: () => console.log('Product XYZ found!'),
  // },
]; 