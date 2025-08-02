// Simplified WMCYN Product Detection - Tote Bag vs T-Shirt Only
// Focus: Color-based detection (pure white vs sand/charred)

interface ColorAnalysisResult {
  dominantColor: 'pure-white' | 'sand-charred' | 'unknown';
  confidence: number;
  avgIntensity: number;
  colorVariance: number;
}

interface ProductDetectionResult {
  productId: string;
  productName: string;
  confidence: number;
  detectionMethod: string;
  debugInfo: {
    color: ColorAnalysisResult;
  };
}

// Cached canvas for performance
let detectionCanvas: HTMLCanvasElement | null = null;
let detectionContext: CanvasRenderingContext2D | null = null;

/**
 * Analyze color to distinguish between pure white t-shirt vs sand/charred tote bag
 */
function analyzeColor(videoElement: HTMLVideoElement): ColorAnalysisResult {
  try {
    // Create or reuse cached canvas
    if (!detectionCanvas) {
      detectionCanvas = document.createElement('canvas');
      detectionContext = detectionCanvas.getContext('2d')!;
    }

    // Sample from center area of video (where marker typically appears)
    const sampleSize = 80;
    detectionCanvas.width = sampleSize;
    detectionCanvas.height = sampleSize;
    
    const centerX = (videoElement.videoWidth - sampleSize) / 2;
    const centerY = (videoElement.videoHeight - sampleSize) / 2;
    
    detectionContext!.drawImage(
      videoElement,
      centerX, centerY, sampleSize, sampleSize,
      0, 0, sampleSize, sampleSize
    );

    const imageData = detectionContext!.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    let pixelCount = 0;
    const colorValues: number[] = [];

    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      totalR += r;
      totalG += g;
      totalB += b;
      pixelCount++;
      
      // Store average intensity for variance calculation
      colorValues.push((r + g + b) / 3);
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    const avgIntensity = (avgR + avgG + avgB) / 3;

    // Calculate color variance (how much colors differ from each other)
    const colorVariance = Math.max(
      Math.abs(avgR - avgG),
      Math.abs(avgG - avgB),
      Math.abs(avgR - avgB)
    );

    // Calculate intensity variance
    const intensityVariance = colorValues.reduce((sum, val) => {
      return sum + Math.pow(val - avgIntensity, 2);
    }, 0) / colorValues.length;

    console.log(`🎨 COLOR ANALYSIS - Intensity: ${(avgIntensity * 255).toFixed(1)}, Variance: ${colorVariance.toFixed(3)}, IntensityVar: ${intensityVariance.toFixed(3)}`);

    // PURE WHITE DETECTION (#FFF - T-Shirt)
    // Very high intensity, very low color variance
    if (avgIntensity > 0.85 && colorVariance < 0.08 && intensityVariance < 0.02) {
      const confidence = Math.min(0.95, avgIntensity * 1.1);
      console.log(`⚪ PURE WHITE detected (T-SHIRT) - intensity:${(avgIntensity * 255).toFixed(1)} variance:${colorVariance.toFixed(3)} conf:${confidence.toFixed(2)}`);
      return {
        dominantColor: 'pure-white',
        confidence,
        avgIntensity: avgIntensity * 255,
        colorVariance
      };
    }

    // SAND/CHARRED DETECTION (Tote Bag)
    // Medium-high intensity but with some color variation (not pure white)
    if (avgIntensity > 0.6 && avgIntensity < 0.85 && (colorVariance > 0.05 || intensityVariance > 0.015)) {
      const confidence = Math.min(0.9, (0.85 - avgIntensity) * 3 + colorVariance * 5);
      console.log(`🏖️ SAND/CHARRED detected (TOTE BAG) - intensity:${(avgIntensity * 255).toFixed(1)} variance:${colorVariance.toFixed(3)} conf:${confidence.toFixed(2)}`);
      return {
        dominantColor: 'sand-charred',
        confidence,
        avgIntensity: avgIntensity * 255,
        colorVariance
      };
    }

    // Unknown/insufficient confidence
    console.log(`❓ UNKNOWN COLOR - intensity:${(avgIntensity * 255).toFixed(1)} variance:${colorVariance.toFixed(3)}`);
    return {
      dominantColor: 'unknown',
      confidence: 0.1,
      avgIntensity: avgIntensity * 255,
      colorVariance
    };

  } catch (error) {
    console.error('❌ Color analysis failed:', error);
    return {
      dominantColor: 'unknown',
      confidence: 0,
      avgIntensity: 0,
      colorVariance: 0
    };
  }
}

/**
 * Detect WMCYN product based on color analysis
 * Focus: Tote Bag (sand/charred) vs T-Shirt (pure white)
 */
export function detectWMCYNProduct(videoElement: HTMLVideoElement): ProductDetectionResult {
  console.log('🔍 Starting simplified WMCYN product detection (Tote vs T-Shirt only)');
  
  const colorResult = analyzeColor(videoElement);
  
  // Minimum confidence threshold
  if (colorResult.confidence < 0.3) {
    console.log(`❌ Color confidence too low: ${colorResult.confidence.toFixed(2)} for ${colorResult.dominantColor}`);
    return {
      productId: 'wmcyn-default-001',
      productName: 'WMCYN product (color detection insufficient)',
      confidence: 0.1,
      detectionMethod: 'insufficient color confidence',
      debugInfo: { color: colorResult }
    };
  }

  // Product mapping based on color
  if (colorResult.dominantColor === 'pure-white') {
    console.log(`👕 WHITE T-SHIRT DETECTED - confidence: ${colorResult.confidence.toFixed(2)}`);
    return {
      productId: 'wmcyn-tshirt-white-001',
      productName: 'White T-Shirt with small black hero marker on back',
      confidence: colorResult.confidence,
      detectionMethod: 'pure white color analysis',
      debugInfo: { color: colorResult }
    };
  }

  if (colorResult.dominantColor === 'sand-charred') {
    console.log(`🛍️ SAND/CHARRED TOTE BAG DETECTED - confidence: ${colorResult.confidence.toFixed(2)}`);
    return {
      productId: 'wmcyn-tote-white-001',
      productName: 'White Tote Bag with larger black hero marker (sand/charred finish)',
      confidence: colorResult.confidence,
      detectionMethod: 'sand/charred color analysis',
      debugInfo: { color: colorResult }
    };
  }

  // Fallback for unknown colors
  console.log(`🤷 UNKNOWN COLOR FALLBACK - ${colorResult.dominantColor}`);
  return {
    productId: 'wmcyn-default-001',
    productName: 'WMCYN product (unknown color)',
    confidence: 0.2,
    detectionMethod: 'unknown color fallback',
    debugInfo: { color: colorResult }
  };
}

/**
 * Cleanup detection resources
 */
export function cleanupDetectionResources(): void {
  detectionCanvas = null;
  detectionContext = null;
  console.log('🧹 Detection resources cleaned up');
}