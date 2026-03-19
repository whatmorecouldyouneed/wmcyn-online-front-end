// overlay configuration types
export type OverlayMode = 'default' | 'custom' | 'stacked';
export type OverlayKind = 'model' | 'video' | 'image' | 'text';

export type OverlayCustom = {
  type: OverlayKind;
  src?: string;
  scale?: [number,number,number];
  position?: [number,number,number];
  rotation?: [number,number,number];
  text?: string;
};

export type OverlayConfig = {
  mode: OverlayMode;
  custom?: OverlayCustom;
};

// ar config response from qr code endpoint
export type ArConfigResponse = {
  code: string;
  targetType: string;
  targetId?: string;
  markerType: 'custom' | 'hiro' | 'kanji';
  markerDataUrl: string;
  overlayConfig: OverlayConfig;
  metadata?: { title?: string; description?: string; actions?: any[] };
  asset3D?: { url: string; type: 'glb'|'gltf'|'usdz'; transform?: { scale?: [number,number,number]; position?: [number,number,number]; rotation?: [number,number,number]; } };
  arjsConfig?: {  // NEW: AR.js configuration from backend
    detectionMode: 'mono' | 'stereo';
    matrixCodeType?: '3x3' | '3x3_HAMMING63' | '3x3_PARITY65' | '4x4';
    patternRatio?: number;
  };
};

// resolved overlay for rendering
export type ResolvedOverlay = Required<Pick<OverlayCustom,'type'>> & Partial<OverlayCustom>;
export type ResolvedArConfig = {
  markerType: ArConfigResponse['markerType'];
  markerDataUrl: string;
  overlays: ResolvedOverlay[];
  meta?: ArConfigResponse['metadata'];
  asset3D?: ArConfigResponse['asset3D'];
};

// ar session data from backend api
export interface ARSessionData {
  sessionId: string;
  markerPattern: {
    url: string;        // direct url to .patt file
    type: string;       // 'custom' | 'hiro' | 'kanji'
    name: string;       // human-readable name
  };
  metadata: {
    title: string;
    description: string;
    actions: Array<{
      type: string;     // 'purchase' | 'share' | 'claim' | 'info'
      label: string;
      url?: string;
    }>;
  };
  overlayConfig?: OverlayConfig; // new field for overlay configuration
  arjsConfig?: {  // NEW: AR.js configuration from backend
    detectionMode: 'mono' | 'stereo';
    matrixCodeType?: '3x3' | '3x3_HAMMING63' | '3x3_PARITY65' | '4x4';
    patternRatio?: number;
  };
  asset3D?: {
    url: string;        // 3d model url
    type: string;       // 'gltf' | 'glb'
    transform: any;     // position, rotation, scale
  };
  product?: {
    id: string;
    name: string;
    price: any;
  };
  campaign?: string;
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// marker generation configuration
export interface MarkerGenerationConfig {
  patternRatio: number;     // 0.0-1.0, typically 0.50
  imageSize: number;        // 256, 512, or 1024
  borderColor: string;      // hex color, e.g., "#000000"
  source: 'manual' | 'generated';
}

// marker validation metadata
export interface MarkerValidation {
  tested: boolean;
  detectionScore?: number;  // 0-100
  testedAt?: string;        // ISO timestamp
  testDevice?: string;      // user agent string
}

// marker pattern details
export interface MarkerPattern {
  id: string;
  name: string;
  type: 'custom' | 'hiro' | 'kanji';
  patternUrl: string;       // .patt file url
  previewUrl: string;       // preview image url
  markerImageUrl?: string;  // full marker image url
  generationConfig?: MarkerGenerationConfig;
  validation?: MarkerValidation;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ar session metadata configuration
export interface ARSessionMetadata {
  title: string;
  description: string;
  actions: Array<{
    type: 'purchase' | 'share' | 'claim' | 'info';
    label: string;
    url?: string;
  }>;
}

// normalized share metadata - derived from overlay data, works for both
// product metadata and ar session / qr code flows
export interface ARShareMetadata {
  title: string;
  description?: string;
  campaign?: string;
  createdAt?: string;
  shareUrl: string;
  ctaLabel?: string;
  /** product marker flow — woven into narrative copy on the share card */
  kind?: 'product' | 'session';
  printDate?: string;
  printLocation?: string;
  quantity?: number;
  editionNumber?: number;
  priceAmount?: string;
  priceCurrency?: string;
  isClaimed?: boolean;
}

// api request types
export interface CreateARSessionRequest {
  name: string;
  description?: string;
  campaign?: string;
  productId?: string;
  markerPattern: {
    patternId: string;
    type: 'custom' | 'hiro' | 'kanji';
  };
  metadata: ARSessionMetadata;
  asset3D?: {
    url: string;
    type: 'gltf' | 'glb';
    transform?: any;
  };
}

export type UpdateARSessionRequest = Partial<CreateARSessionRequest>;

// marker pattern upload request
export interface UploadMarkerPatternRequest {
  name: string;
  description?: string;
  type: 'upload';
  imageFile: {
    data: string;       // base64 data
    mimeType: string;
    filename: string;
  };
  // NEW FIELDS:
  pattFile?: {
    data: string;       // .patt file content (text, not base64)
    filename: string;   // e.g., "marker-xyz.patt"
  };
  generationConfig?: MarkerGenerationConfig;
  validation?: MarkerValidation;
}

// api response types
export interface ARSessionListResponse {
  arSessions: ARSessionData[];
  total: number;
}

export interface MarkerPatternListResponse {
  markerPatterns?: MarkerPattern[];
  patterns?: MarkerPattern[];
  total?: number;
}

export interface UploadMarkerPatternResponse {
  patternId: string;
  patternUrl: string;        // .patt file url
  previewUrl: string;        // preview image url
  markerImageUrl: string;    // full marker image url
  validationStatus?: {       // validation metadata
    tested: boolean;
    score?: number;
    testedAt?: string;
  };
}
