import type { PublicProductSet } from './productSets';

export type InstanceStatus = 'claimable' | 'claimed' | 'void';

export type ProductAR = {
  mindFileUrl: string | null;
  sourceImageUrl: string | null;
  physicalWidthMeters: number | null;
  asset3D: unknown;
};

// GET /v1/instances/:publicId: what an item is, never who owns it
export type PublicInstance = {
  publicId: string;
  status: InstanceStatus;
  editionNumber: number | null;
  editionSize: number | null;
  size: string | null;
  canonicalUrl: string;
  productSet: PublicProductSet | null;
  ar: ProductAR | null;
  ownedByYou: boolean;
};

export type CollectionItem = {
  kind: 'instance' | 'purchase' | 'redemption';
  id: string;
  title: string | null;
  acquiredAt: string | null;
  via: string;
  publicId?: string;
  productSetId?: string | null;
  editionNumber?: number | null;
  editionSize?: number | null;
  productId?: string | null;
  variantId?: string | null;
  code?: string | null;
};

export type MintRequest = {
  productSetId: string;
  count: number;
  editionSize?: number;
  firstEditionNumber?: number;
  size?: string;
};

// claim links and codes appear only in this response
export type MintedInstance = {
  publicId: string;
  editionNumber: number | null;
  publicUrl: string;
  claimUrl: string;
  claimCode: string;
};

export type MintResponse = {
  batchId: string;
  productSetName: string | null;
  instances: MintedInstance[];
};

export type AdminInstance = {
  publicId: string;
  productSetId: string;
  status: InstanceStatus;
  editionNumber: number | null;
  editionSize: number | null;
  size: string | null;
  batchId: string;
  mintedAt: string | null;
  claimedAt: string | null;
};
