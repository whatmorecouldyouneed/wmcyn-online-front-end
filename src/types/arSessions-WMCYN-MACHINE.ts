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
  markerType: 'custom' | 'hiro' | 'kanji' | 'nft' | 'mind';
  markerDataUrl: string;
  overlayConfig: OverlayConfig;
  metadata?: { title?: string; description?: string; actions?: any[] };
  asset3D?: { url: string; type: 'glb'|'gltf'|'usdz'; transform?: { scale?: [number,number,number]; position?: [number,number,number]; rotation?: [number,number,number]; } };
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
// per backend docs: GET /api/ar-sessions/:id/data (public) and GET /v1/ar-sessions/:id (admin)
export interface ARSessionData {
  sessionId: string;
  id?: string;  // backend may return 'id' instead of 'sessionId'
  name?: string; // optional name field from backend
  productId?: string; // from backend
  productSetId?: string; // from backend
  markerPattern: {
    url?: string;        // .mind file url (MindAR)
    type: string;       // 'mind' (MindAR) | 'custom' | 'hiro' | 'kanji' | 'nft' (legacy)
    name?: string;       // human-readable name
    patternId?: string;  // backend may return patternId
    previewUrl?: string; // preview image url for embedding in qr codes
  };
  // per backend docs: mindARConfig from GET /api/ar-sessions/:id/data
  mindARConfig?: {
    filterMinCF: number; // default: 0.001
    filterBeta: number; // default: 1000
    missTolerance: number; // default: 5
    warmupTolerance: number; // default: 5
  };
  metadata: {
    title: string;
    description: string;
    actions: Array<{
      type: string;     // 'purchase' | 'share' | 'claim' | 'info'
      label: string;
      url?: string;
      productId?: string; // per backend spec
    }>;
  };
  overlayConfig?: OverlayConfig; // new field for overlay configuration
  asset3D?: {
    url: string;        // 3d model url
    type: string;       // 'gltf' | 'glb'
    transform?: {       // per backend spec
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
    };
  };
  product?: {
    id: string;
    name: string;
    price: any;
  };
  campaign?: string;
  tags?: string[]; // per backend spec
  expiresAt?: string; // ISO timestamp per backend spec
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// marker pattern details
export interface MarkerPattern {
  id: string;
  name: string;
  type: 'custom' | 'hiro' | 'kanji' | 'nft';
  patternUrl: string;   // .patt file url or nft descriptor path (without extension for nft)
  previewUrl: string;   // preview image url
  createdBy: string;
  createdAt: string;
}

// ar session metadata configuration
export interface ARSessionMetadata {
  title: string;
  description?: string; // optional to match usage in components
  actions: Array<{
    type: 'purchase' | 'share' | 'claim' | 'info';
    label: string;
    url?: string;
  }>;
  createdAt?: string; // optional for "printed on" display
  campaign?: string; // optional for campaign display
}

// api request types
// per backend docs: POST /v1/ar-sessions/create
export interface CreateARSessionRequest {
  productId: string; // required per backend
  productSetId?: string; // optional per backend
  markerPattern: {
    patternId: string; // required per backend
    type?: 'mind'; // optional, defaults to 'mind' per backend
  };
  metadata: {
    title: string; // required per backend
    description: string; // required per backend
    actions: Array<{
      type: 'purchase' | 'share' | 'claim' | 'info';
      label: string;
      url?: string;
      productId?: string;
    }>;
  };
  asset3D?: {
    url: string;
    type: 'gltf' | 'glb';
    transform?: {
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
    };
  };
  overlayConfig?: {
    mode: 'default' | 'custom' | 'stacked';
    custom?: {
      type: 'model' | 'video' | 'image' | 'text';
      src?: string;
      scale?: [number, number, number];
      position?: [number, number, number];
      rotation?: [number, number, number];
      text?: string;
    };
  };
  campaign?: string;
  tags?: string[];
  expiresAt?: string; // ISO timestamp
}

export type UpdateARSessionRequest = Partial<CreateARSessionRequest>;

// marker pattern upload request (legacy - backend compiles)
export interface UploadMarkerPatternRequest {
  name: string;
  type: 'upload';          // required by backend
  description?: string;
  productSetId?: string;   // optional product set to associate with
  imageFile: {
    data: string;          // base64 encoded image data
    mimeType: string;      // e.g. 'image/png'
    filename: string;      // original filename
  };
}

// nft marker upload request (frontend compiles .mind file)
export interface UploadNFTMarkerRequest {
  sourceImageData: string;  // base64 encoded source image
  mindFileData: string;     // base64 encoded pre-compiled .mind file
  filename: string;         // name for the file
  quality?: number;         // optional quality score (0-100)
}

// nft marker response
export interface NFTMarkerResponse {
  mindFileUrl: string;
  sourceImageUrl: string;
  quality?: number;
  compiledAt?: string;
}

// api response types
// backend may return either 'sessions' or 'arSessions' property
export interface ARSessionListResponse {
  arSessions?: ARSessionData[];
  sessions?: ARSessionData[];
  total?: number;
}

export interface MarkerPatternListResponse {
  markerPatterns?: MarkerPattern[];
  patterns?: MarkerPattern[];
  items?: MarkerPattern[];
  total?: number;
}

export interface UploadMarkerPatternResponse {
  patternId: string;
  mindFileUrl: string;      // url to compiled .mind file
  sourceImageUrl: string;   // url to source image
  patternUrl?: string;      // deprecated, use mindFileUrl
  previewUrl?: string;      // deprecated, use sourceImageUrl
  quality?: number;         // quality score 0-100
}

// marker validation result
export interface MarkerValidation {
  isValid: boolean;
  score?: number;
  issues?: string[];
  testedAt: string;
}
