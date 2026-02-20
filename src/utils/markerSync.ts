// bidirectional sync utilities for converting between backend formats and MarkerConfig
// ensures 1:1 matching and mindar compatibility per public/patterns/README.md

import { MarkerConfig, ProductMetadata } from '@/config/markers';
import { ARSessionData, ARSessionMetadata, CreateARSessionRequest } from '@/types/arSessions';
import { ProductSet, AROverlayMetadata } from '@/types/productSets';

// validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// mindar compiler tool reference per README.md
const MINDAR_COMPILER_URL = 'https://hiukim.github.io/mind-ar-js-doc/tools/compile/';

/**
 * validate mindar compatibility for a marker config
 * per public/patterns/README.md: image-based markers (markerType: 'nft') must use .mind files
 */
export function validateMindARCompatibility(config: MarkerConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // check nft markers have .mind files
  if (config.markerType === 'nft') {
    if (!config.mindTargetSrc) {
      errors.push(`markerType 'nft' requires mindTargetSrc pointing to a .mind file. see ${MINDAR_COMPILER_URL}`);
    } else if (!config.mindTargetSrc.endsWith('.mind')) {
      errors.push(`mindTargetSrc must point to a .mind file (got: ${config.mindTargetSrc}). compile using ${MINDAR_COMPILER_URL}`);
    }

    // warn if patternUrl is set for nft marker (should use mindTargetSrc instead)
    if (config.patternUrl && !config.patternUrl.endsWith('.mind')) {
      warnings.push(`nft markers should use mindTargetSrc for .mind files, not patternUrl for .patt files`);
    }
  }

  // check pattern markers use .patt files (legacy ar.js)
  if (config.markerType === 'pattern' && config.patternUrl && !config.patternUrl.endsWith('.patt')) {
    warnings.push(`pattern markers typically use .patt files, but got: ${config.patternUrl}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * validate marker config structure
 */
export function validateMarkerConfig(config: MarkerConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // required fields
  if (!config.name) {
    errors.push('marker config missing required field: name');
  }
  if (!config.modelUrl) {
    errors.push('marker config missing required field: modelUrl');
  }

  // validate mindar compatibility
  const mindarValidation = validateMindARCompatibility(config);
  errors.push(...mindarValidation.errors);
  warnings.push(...mindarValidation.warnings);

  // validate metadata structure if present
  if (config.metadata) {
    if ('title' in config.metadata && !config.metadata.title) {
      warnings.push('metadata.title is empty');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * convert ar session data to marker config
 */
export function arsessionToMarkerConfig(session: ARSessionData): MarkerConfig {
  const sessionId = session.sessionId || session.id || 'unknown';
  const markerPattern = session.markerPattern;
  
  // determine marker type and source
  const isNFT = markerPattern.type === 'nft' || markerPattern.type === 'mind';
  const markerType: 'pattern' | 'nft' = isNFT ? 'nft' : 'pattern';
  
  // resolve marker source - prioritize .mind files for nft markers
  let patternUrl: string | undefined;
  let mindTargetSrc: string | undefined;
  
  if (isNFT) {
    // for nft markers, look for .mind file url
    if (markerPattern.url && markerPattern.url.endsWith('.mind')) {
      mindTargetSrc = markerPattern.url;
    } else if (markerPattern.patternId) {
      // assume patternId might be a .mind file reference
      const possibleMindUrl = markerPattern.url || `/patterns/${markerPattern.patternId}.mind`;
      if (possibleMindUrl.endsWith('.mind')) {
        mindTargetSrc = possibleMindUrl;
      } else {
        // warn if backend returns non-.mind file for nft marker
        console.warn(`[markerSync] ar session ${sessionId} has markerType 'nft' but no .mind file. got: ${markerPattern.url}`);
        mindTargetSrc = markerPattern.url; // fallback
      }
    }
  } else {
    // pattern markers use .patt files
    patternUrl = markerPattern.url || (markerPattern.patternId ? `/patterns/${markerPattern.patternId}.patt` : undefined);
  }

  // convert metadata
  const metadata: ARSessionMetadata = {
    title: session.metadata.title,
    description: session.metadata.description,
    actions: session.metadata.actions?.map(action => ({
      type: action.type as 'purchase' | 'share' | 'claim' | 'info',
      label: action.label,
      url: action.url
    })) || [],
    createdAt: session.createdAt,
    campaign: session.campaign
  };

  const config: MarkerConfig = {
    name: markerPattern.name || session.name || sessionId,
    patternUrl,
    modelUrl: session.asset3D?.url || '/models/wmcyn_3d_logo.glb',
    scale: session.asset3D?.transform?.scale?.[0] || 0.3,
    label: session.metadata.title,
    markerType,
    mindTargetSrc,
    metadata,
    onFound: () => {
      console.log('ar session marker found:', sessionId);
    }
  };

  // validate the converted config
  const validation = validateMarkerConfig(config);
  if (!validation.isValid) {
    console.error(`[markerSync] validation errors for ar session ${sessionId}:`, validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn(`[markerSync] validation warnings for ar session ${sessionId}:`, validation.warnings);
  }

  return config;
}

/**
 * convert product set to marker config (if it has ar configuration)
 */
export function productSetToMarkerConfig(productSet: ProductSet): MarkerConfig | null {
  // only convert if product set has ar configuration
  if (!productSet.nftMarker && !productSet.linkedARSessionId && !productSet.arMetadata) {
    return null;
  }

  // determine marker type and source
  let markerType: 'pattern' | 'nft' = 'pattern';
  let patternUrl: string | undefined;
  let mindTargetSrc: string | undefined;

  // prioritize nft marker (from backend .mind file upload)
  if (productSet.nftMarker?.mindFileUrl) {
    markerType = 'nft';
    mindTargetSrc = productSet.nftMarker.mindFileUrl;
    
    // validate .mind file
    if (!mindTargetSrc.endsWith('.mind')) {
      console.warn(`[markerSync] product set ${productSet.id} nftMarker.mindFileUrl does not end with .mind: ${mindTargetSrc}`);
    }
  } else if (productSet.linkedARSessionId) {
    // if linked to ar session, we can't resolve it here - return null
    // caller should fetch the ar session separately
    return null;
  } else {
    // fallback to pattern marker
    patternUrl = '/patterns/pattern-wmcyn_logo_full.patt';
  }

  // convert ar metadata
  const arMeta = productSet.arMetadata;
  const metadata: ARSessionMetadata = {
    title: arMeta?.title || productSet.name || 'WMCYN AR Experience',
    description: arMeta?.description || productSet.description,
    actions: arMeta?.actions?.map(action => ({
      type: action.type as 'purchase' | 'share' | 'claim' | 'info',
      label: action.label,
      url: action.url
    })) || [],
    createdAt: productSet.createdAt,
    campaign: productSet.campaign
  };

  const config: MarkerConfig = {
    name: `product-set-${productSet.id}`,
    patternUrl,
    modelUrl: '/models/wmcyn_3d_logo.glb',
    scale: 0.5,
    label: metadata.title,
    markerType,
    mindTargetSrc,
    metadata
  };

  // validate the converted config
  const validation = validateMarkerConfig(config);
  if (!validation.isValid) {
    console.error(`[markerSync] validation errors for product set ${productSet.id}:`, validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn(`[markerSync] validation warnings for product set ${productSet.id}:`, validation.warnings);
  }

  return config;
}

/**
 * convert marker config to ar session creation request
 */
export function markerConfigToARSession(config: MarkerConfig): CreateARSessionRequest {
  // validate config first
  const validation = validateMarkerConfig(config);
  if (!validation.isValid) {
    throw new Error(`invalid marker config: ${validation.errors.join(', ')}`);
  }

  // determine marker pattern type
  let markerPatternType: 'custom' | 'hiro' | 'kanji' | 'nft' = 'custom';
  if (config.markerType === 'nft') {
    markerPatternType = 'nft';
  }

  // extract metadata
  const metadata = config.metadata as ARSessionMetadata;
  if (!metadata || !metadata.title) {
    throw new Error('marker config must have metadata with title for ar session creation');
  }

  const request: CreateARSessionRequest = {
    name: config.name,
    description: metadata.description,
    campaign: metadata.campaign,
    markerPattern: {
      patternId: config.name, // use name as pattern id - backend will resolve
      type: markerPatternType
    },
    metadata: {
      title: metadata.title,
      description: metadata.description,
      actions: metadata.actions || []
    }
  };

  // add 3d asset if present
  if (config.modelUrl && config.modelUrl !== '/models/wmcyn_3d_logo.glb') {
    request.asset3D = {
      url: config.modelUrl,
      type: config.modelUrl.endsWith('.glb') ? 'glb' : 'gltf',
      transform: config.scale ? {
        scale: [config.scale, config.scale, config.scale],
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      } : undefined
    };
  }

  return request;
}

/**
 * validate backend ar session matches marker config structure
 */
export function validateBackendARSession(session: ARSessionData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // check required fields
  if (!session.sessionId && !session.id) {
    errors.push('ar session missing sessionId or id');
  }
  if (!session.markerPattern) {
    errors.push('ar session missing markerPattern');
  } else {
    // validate mindar compatibility
    if (session.markerPattern.type === 'nft' || session.markerPattern.type === 'mind') {
      const hasMindFile = session.markerPattern.url?.endsWith('.mind');
      if (!hasMindFile && session.markerPattern.url) {
        errors.push(`ar session has markerType 'nft' but markerPattern.url does not point to .mind file. got: ${session.markerPattern.url}. see ${MINDAR_COMPILER_URL}`);
      } else if (!session.markerPattern.url) {
        warnings.push(`ar session has markerType 'nft' but no markerPattern.url. ensure .mind file is uploaded. see ${MINDAR_COMPILER_URL}`);
      }
    }
  }
  if (!session.metadata || !session.metadata.title) {
    errors.push('ar session missing metadata.title');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * validate backend product set matches marker config structure
 */
export function validateBackendProductSet(productSet: ProductSet): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // check required fields
  if (!productSet.id) {
    errors.push('product set missing id');
  }
  if (!productSet.name) {
    errors.push('product set missing name');
  }

  // validate nft marker if present
  if (productSet.nftMarker) {
    if (!productSet.nftMarker.mindFileUrl) {
      errors.push('product set nftMarker missing mindFileUrl');
    } else if (!productSet.nftMarker.mindFileUrl.endsWith('.mind')) {
      errors.push(`product set nftMarker.mindFileUrl must point to .mind file. got: ${productSet.nftMarker.mindFileUrl}. see ${MINDAR_COMPILER_URL}`);
    }
  }

  // validate ar metadata if present
  if (productSet.arMetadata && !productSet.arMetadata.title) {
    warnings.push('product set arMetadata.title is empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

