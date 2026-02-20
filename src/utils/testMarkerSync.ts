// test utilities for marker sync validation
// run these in browser console or import in test files

import { 
  validateMindARCompatibility, 
  validateMarkerConfig,
  validateBackendARSession,
  validateBackendProductSet,
  arsessionToMarkerConfig,
  productSetToMarkerConfig
} from './markerSync';
import { markerConfigs } from '@/config/markers';
import type { ARSessionData } from '@/types/arSessions';
import type { ProductSet } from '@/types/productSets';

/**
 * test all hardcoded markers in markers.ts
 */
export function testHardcodedMarkers() {
  console.group('🧪 Testing Hardcoded Markers');
  
  let allValid = true;
  markerConfigs.forEach((config, index) => {
    const validation = validateMarkerConfig(config);
    const status = validation.isValid ? '✅' : '❌';
    
    console.log(`${status} Marker ${index + 1}: ${config.name}`, {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      markerType: config.markerType,
      mindTargetSrc: config.mindTargetSrc
    });
    
    if (!validation.isValid) {
      allValid = false;
    }
  });
  
  console.log(allValid ? '✅ All markers valid!' : '❌ Some markers have errors');
  console.groupEnd();
  
  return allValid;
}

/**
 * test mindar compatibility validation
 */
export function testMindARValidation() {
  console.group('🧪 Testing MindAR Validation');
  
  // test 1: valid nft marker with .mind file
  const validNFT = {
    name: 'test-valid',
    modelUrl: '/models/test.glb',
    markerType: 'nft' as const,
    mindTargetSrc: '/patterns/test.mind'
  };
  const validResult = validateMindARCompatibility(validNFT);
  console.log('✅ Valid NFT marker:', validResult);
  
  // test 2: invalid nft marker without .mind file
  const invalidNFT = {
    name: 'test-invalid',
    modelUrl: '/models/test.glb',
    markerType: 'nft' as const
    // missing mindTargetSrc
  };
  const invalidResult = validateMindARCompatibility(invalidNFT);
  console.log('❌ Invalid NFT marker (missing .mind):', invalidResult);
  
  // test 3: invalid nft marker with wrong file type
  const wrongFileType = {
    name: 'test-wrong',
    modelUrl: '/models/test.glb',
    markerType: 'nft' as const,
    mindTargetSrc: '/patterns/test.patt' // wrong file type
  };
  const wrongResult = validateMindARCompatibility(wrongFileType);
  console.log('❌ Invalid NFT marker (wrong file type):', wrongResult);
  
  console.groupEnd();
}

/**
 * test ar session conversion
 */
export function testARSessionConversion() {
  console.group('🧪 Testing AR Session Conversion');
  
  const mockSession: ARSessionData = {
    sessionId: 'test-session-123',
    markerPattern: {
      type: 'nft',
      url: 'https://storage.googleapis.com/test/marker.mind',
      name: 'Test Marker'
    },
    metadata: {
      title: 'Test AR Session',
      description: 'Test description',
      actions: [
        { type: 'purchase', label: 'Buy Now', url: 'https://example.com' }
      ]
    },
    asset3D: {
      url: '/models/test.glb',
      type: 'glb',
      transform: { scale: [0.5, 0.5, 0.5] }
    },
    status: 'active',
    createdBy: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // validate backend session
  const backendValidation = validateBackendARSession(mockSession);
  console.log('Backend validation:', backendValidation);
  
  // convert to marker config
  const markerConfig = arsessionToMarkerConfig(mockSession);
  console.log('Converted MarkerConfig:', markerConfig);
  
  // validate converted config
  const configValidation = validateMarkerConfig(markerConfig);
  console.log('Config validation:', configValidation);
  
  console.groupEnd();
  
  return { markerConfig, validations: { backendValidation, configValidation } };
}

/**
 * test product set conversion
 */
export function testProductSetConversion() {
  console.group('🧪 Testing Product Set Conversion');
  
  const mockProductSet: ProductSet = {
    id: 'test-product-123',
    name: 'Test Product Set',
    description: 'Test description',
    items: [],
    nftMarker: {
      mindFileUrl: 'https://storage.googleapis.com/test/marker.mind',
      sourceImageUrl: 'https://storage.googleapis.com/test/image.jpg',
      compiledAt: new Date().toISOString(),
      quality: 85
    },
    arMetadata: {
      title: 'Test AR Experience',
      description: 'Test AR description',
      actions: [
        { type: 'claim', label: 'Claim Product', url: undefined }
      ]
    },
    createdAt: new Date().toISOString(),
    campaign: 'test-campaign'
  };
  
  // validate backend product set
  const backendValidation = validateBackendProductSet(mockProductSet);
  console.log('Backend validation:', backendValidation);
  
  // convert to marker config
  const markerConfig = productSetToMarkerConfig(mockProductSet);
  console.log('Converted MarkerConfig:', markerConfig);
  
  if (markerConfig) {
    // validate converted config
    const configValidation = validateMarkerConfig(markerConfig);
    console.log('Config validation:', configValidation);
  } else {
    console.log('⚠️ Product set has no AR configuration');
  }
  
  console.groupEnd();
  
  return { markerConfig, validation: backendValidation };
}

/**
 * run all tests
 */
export function runAllTests() {
  console.log('🚀 Running All Marker Sync Tests\n');
  
  testHardcodedMarkers();
  console.log('\n');
  
  testMindARValidation();
  console.log('\n');
  
  testARSessionConversion();
  console.log('\n');
  
  testProductSetConversion();
  
  console.log('\n✅ All tests complete! Check results above.');
}

// export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testMarkerSync = {
    testHardcodedMarkers,
    testMindARValidation,
    testARSessionConversion,
    testProductSetConversion,
    runAllTests
  };
}

