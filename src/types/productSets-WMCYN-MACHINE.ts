// product set item definition
export interface ProductSetItem {
  productId: string;
  quantity?: number;  // frontend uses quantity
  qty?: number;       // backend may expect qty
  variantId?: string;
  maxPerUser?: number;
}

// checkout configuration
export interface CheckoutConfig {
  cartLink?: string;
  discountCode?: string;
  type: 'cart' | 'checkout' | 'product';
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

// redeem policy for QR codes
// per backend docs: redeemPolicy in POST /v1/qrcodes/generate
export interface RedeemPolicy {
  mode: 'VIEW_ONLY' | 'CLAIMABLE'; // required per backend
  requireAuth: boolean; // required per backend
  oneClaimPerUser?: boolean;
  maxTotalClaims?: number; // backend uses maxTotalClaims, not maxClaims
  startAt?: string; // ISO timestamp
  endAt?: string; // ISO timestamp
  geoFence?: { // backend uses camelCase geoFence
    lat: number;
    lng: number;
    radiusMeters: number;
  };
  strictIpCheck?: boolean;
  acceptLowAccuracy?: boolean;
  // legacy fields for backward compatibility
  geofence?: Geofence; // deprecated, use geoFence
  timeWindow?: TimeWindow; // deprecated, use startAt/endAt
  perUserLimit?: number; // deprecated, use oneClaimPerUser
  maxClaims?: number; // deprecated, use maxTotalClaims
}

// product set statistics
export interface ProductSetStats {
  totalClaims: number;
  remainingInventory: number;
  qrCodesGenerated: number;
}

// product set stats response from backend
// per backend docs: GET /v1/productSets/:id/stats
export interface ProductSetStatsResponse {
  productSetId: string;
  totalItems: number;
  totalClaims: number;
  remainingTotal: number;
  reservedTotal: number;
  items: Array<{
    productId: string;
    variantId?: string;
    maxQty: number;
    remaining: number;
    reserved: number;
    maxPerUser?: number;
    metadata?: Record<string, any>;
  }>;
  updatedAt: string;
}

// nft marker for product set ar tracking
export interface NFTMarker {
  mindFileUrl: string;      // firebase storage cdn url for .mind file
  sourceImageUrl: string;   // original image preview url
  compiledAt: string;       // iso timestamp when compiled
  quality?: number;         // 0-100 quality score
}

// upload request for nft marker
export interface UploadNFTMarkerRequest {
  mindFileData: string;     // base64 encoded .mind file
  sourceImageData: string;  // base64 encoded source image
  filename: string;         // name for the marker
  quality?: number;         // optional quality score
}

// ar overlay metadata for product sets
export interface AROverlayMetadata {
  title: string;              // title shown in ar overlay
  description?: string;       // description shown in ar overlay
  actions?: Array<{           // action buttons in ar overlay
    type: string;
    label: string;
    url?: string;
  }>;
}

// main product set interface
export interface ProductSet {
  id: string;
  name: string;
  description?: string;
  campaign?: string;
  items: ProductSetItem[];
  checkout?: CheckoutConfig;  // optional - backend may not return
  stats?: ProductSetStats;    // optional - backend may not return
  linkedARSessionId?: string; // optional link to AR session
  nftMarker?: NFTMarker;      // optional nft marker for ar tracking
  arMetadata?: AROverlayMetadata; // ar overlay title/description/actions
  version?: number;           // from backend
  createdBy?: string;         // from backend
  createdAt?: string;         // optional
  updatedAt?: string;         // optional
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
  redeemPolicy?: RedeemPolicy;
  stats?: {
    claimsUsed: number;
    remainingClaims: number;
  };
}

// API request/response types
// per backend docs: POST /v1/productSets/create
export interface CreateProductSetRequest {
  name: string; // required
  items: Array<{
    productId: string; // required
    variantId?: string;
    qty: number; // required (backend uses 'qty', not 'quantity')
    maxPerUser?: number;
    metadata?: Record<string, any>;
  }>; // required, must have at least 1 item
  campaign?: string;
  tags?: string[];
  checkoutMode?: 'NONE' | 'SHOPIFY_CART_LINK' | 'DISCOUNT_CODE'; // backend uses checkoutMode
  discountCode?: string; // required if checkoutMode is 'DISCOUNT_CODE'
  // legacy fields for backward compatibility
  description?: string;
  checkout?: CheckoutConfig; // deprecated, use checkoutMode
  remainingInventory?: number;
  linkedARSessionId?: string;
  nftMarker?: Partial<NFTMarker>;
  arMetadata?: AROverlayMetadata;
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
  productSetId?: string;
  sessionId?: string;
  target: {
    type: "PRODUCT_SET";
    productSetId: string;
  } | {
    type: "AR_SESSION";
    sessionId: string;
  };
  policy?: RedeemPolicy;
  expiresAt?: string;
  label?: string;
  campaign?: string;
}

export interface GenerateQRCodeResponse {
  qrCode: QRCodeData;
  qrUrl: string; // legacy field for backward compatibility
}

// API response wrappers
// backend returns { items: [...], total, limit, offset }
export interface ProductSetsResponse {
  items?: ProductSet[];
  productSets?: ProductSet[];
  products?: ProductSet[];
  data?: ProductSet[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface QRCodesResponse {
  qrCodes?: QRCodeData[];
  qrcodes?: QRCodeData[]; // lowercase variant from API
  items?: QRCodeData[];
  data?: QRCodeData[];
  total?: number;
}
