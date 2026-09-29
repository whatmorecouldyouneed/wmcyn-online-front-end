// product set item definition
export interface ProductSetItem {
  productId: string;
  variantId?: string;  // required for inventory tracking
  qty: number;
  maxPerUser?: number;
  metadata?: Record<string, any>;
}

// checkout behaviour stored by the backend
export type CheckoutMode = 'NONE' | 'SHOPIFY_CART_LINK' | 'DISCOUNT_CODE';

// compiled mindar target uploaded for a product set
export interface NFTMarker {
  mindFileUrl: string;
  sourceImageUrl: string;
  compiledAt: string;
  quality?: number;
}

// public landing page fields; a product with a slug is served at /{slug}
export interface ProductLanding {
  slug?: string;
  description?: string;
  garmentWord?: string;
  modelUrl?: string;
  scale?: number;
  yOffset?: number;
  rotationOffset?: [number, number, number];
}

// geofence configuration
export interface Geofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

// time window for claims
export interface TimeWindow {
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

// redeem policy as edited in the admin form
export interface RedeemPolicy {
  geofence?: Geofence;
  timeWindow?: TimeWindow;
  perUserLimit: number;
  maxClaims: number;
}

// redeem policy as stored on a qr code and enforced by the claim endpoint
export interface BackendRedeemPolicy {
  mode: 'VIEW_ONLY' | 'CLAIMABLE';
  requireAuth: boolean;
  oneClaimPerUser?: boolean;
  maxTotalClaims?: number;
  startAt?: string;
  endAt?: string;
  geoFence?: { lat: number; lng: number; radiusMeters: number } | null;
}

// product set statistics
export interface ProductSetStats {
  totalClaims: number;
  remainingInventory: number;
  qrCodesGenerated: number;
}

// main product set interface
export interface ProductSet extends ProductLanding {
  id: string;
  name: string;
  campaign?: string;
  tags?: string[];
  items: ProductSetItem[];
  checkoutMode: CheckoutMode;
  discountCode?: string;
  nftMarker?: NFTMarker;
  stats: ProductSetStats;
  version?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// what GET /v1/productSets/by-slug/:slug returns
export interface PublicProductSet extends ProductLanding {
  id: string;
  name: string;
  slug: string;
  campaign?: string;
  checkoutMode?: CheckoutMode;
  discountCode?: string;
  nftMarker?: NFTMarker;
}

// QR code data with new structure
export interface QRCodeData {
  id: string;
  code: string;
  label?: string;
  campaign?: string;
  status: "active" | "expired" | "revoked";
  target: {
    type: "PRODUCT_SET";
    productSetId: string;
  } | {
    type: "AR_SESSION";
    sessionId: string;
  };
  assets: { 
    qrSvgUrl: string; 
    qrPngUrl: string; 
    printPdfUrl?: string; 
  };
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  redeemPolicy?: BackendRedeemPolicy;
  stats?: {
    claimsUsed: number;
    remainingClaims: number;
  };
}

// API request/response types
export interface CreateProductSetRequest extends ProductLanding {
  name: string;
  campaign?: string;
  tags?: string[];
  items: ProductSetItem[];
  checkoutMode?: CheckoutMode;
  discountCode?: string;
}

export type UpdateProductSetRequest = Partial<CreateProductSetRequest>;

// AR Scene type
export interface ARScene {
  id: string;
  name: string;
  description?: string;
  marker: string; // ar.js marker pattern (e.g., 'HIRO', 'KANJI')
  assetUrl?: string; // 3d model url
  assetType?: 'gltf' | 'glb' | 'obj' | 'fbx';
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  animation?: {
    enabled: boolean;
    type?: 'spin' | 'bounce' | 'float';
    speed?: number;
  };
  lighting?: {
    intensity: number;
    color: string;
  };
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  campaign?: string;
}

export interface GenerateQRCodeRequest {
  target: {
    type: "PRODUCT_SET";
    productSetId: string;
  } | {
    type: "AR_SESSION";
    sessionId: string;
  };
  redeemPolicy?: BackendRedeemPolicy;
  expiresAt?: string;
  label?: string;
  campaign?: string;
}

export interface GenerateQRCodeResponse {
  code: string;
  qrUrl: string;
  assets: {
    qrSvgUrl: string;
    qrPngUrl: string;
  };
  // legacy field for backward compatibility
  qrCode?: QRCodeData;
}

// API response wrappers
export interface ProductSetsResponse {
  productSets: ProductSet[];
  total: number;
}

export interface QRCodesResponse {
  qrCodes: QRCodeData[];
  total: number;
}
