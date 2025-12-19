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
export interface RedeemPolicy {
  geofence?: Geofence;
  timeWindow?: TimeWindow;
  perUserLimit: number;
  maxClaims: number;
}

// product set statistics
export interface ProductSetStats {
  totalClaims: number;
  remainingInventory: number;
  qrCodesGenerated: number;
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
export interface CreateProductSetRequest {
  name: string;
  description?: string;
  campaign?: string;
  items: ProductSetItem[];
  checkout: CheckoutConfig;
  remainingInventory?: number;
  linkedARSessionId?: string; // optional link to AR session
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
  qrCodes: QRCodeData[];
  total: number;
}
