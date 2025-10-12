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

// marker pattern details
export interface MarkerPattern {
  id: string;
  name: string;
  type: 'custom' | 'hiro' | 'kanji';
  patternUrl: string;   // .patt file url
  previewUrl: string;   // preview image url
  createdBy: string;
  createdAt: string;
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
}

// api response types
export interface ARSessionListResponse {
  arSessions: ARSessionData[];
  total: number;
}

export interface MarkerPatternListResponse {
  markerPatterns: MarkerPattern[];
  total: number;
}

export interface UploadMarkerPatternResponse {
  patternId: string;
  patternUrl: string;
  previewUrl: string;
}
