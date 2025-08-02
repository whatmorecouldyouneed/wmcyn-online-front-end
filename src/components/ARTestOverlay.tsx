import React, { useState } from 'react';
import { detectWMCYNProduct } from '../utils/productDetection';
import { markerConfigs } from '../config/markers';

interface ARTestOverlayProps {
  onTestProduct: (productId: string) => void;
  videoElement?: HTMLVideoElement;
}

const ARTestOverlay: React.FC<ARTestOverlayProps> = ({ onTestProduct, videoElement }) => {
  const [testResults, setTestResults] = useState<string>('');

  // Simplified test products - only tote bag and t-shirt
  const testProducts = [
    { id: 'wmcyn-tote-white-001', name: 'Tote Bag (Sand/Charred)', color: '#D2B48C' },
    { id: 'wmcyn-tshirt-white-001', name: 'T-Shirt (Pure White)', color: '#FFFFFF' }
  ];

  const runDetectionTest = async () => {
    if (!videoElement) {
      setTestResults('❌ No video element available for testing');
      return;
    }

    try {
      console.log('🧪 Running simplified color detection test...');
      const result = detectWMCYNProduct(videoElement);
      
      setTestResults(`
🔍 SIMPLIFIED DETECTION TEST RESULTS:
═══════════════════════════════════════

✅ Product: ${result.productName}
🔗 ID: ${result.productId}
📊 Confidence: ${result.confidence.toFixed(2)}
🔧 Method: ${result.detectionMethod}

🎨 Color Analysis:
───────────────────
Detected: ${result.debugInfo.color.dominantColor}
Confidence: ${result.debugInfo.color.confidence.toFixed(2)}
Intensity: ${result.debugInfo.color.avgIntensity.toFixed(1)}
Variance: ${result.debugInfo.color.colorVariance.toFixed(3)}

${result.debugInfo.color.dominantColor === 'pure-white' ? '⚪ PURE WHITE = T-SHIRT!' : ''}
${result.debugInfo.color.dominantColor === 'sand-charred' ? '🏖️ SAND/CHARRED = TOTE BAG!' : ''}

🎯 FOCUS: Color is the primary differentiator
• Pure white (#FFF) → T-Shirt
• Sand/charred (darker) → Tote Bag
      `);
    } catch (error) {
      setTestResults(`❌ Detection test failed: ${error}`);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '95px', // positioned next to FPS counter
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      maxWidth: '350px',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🧪 Product Detection Test</h3>
      <div style={{ marginBottom: '10px' }}>
        <strong>Color-Based Detection:</strong> Tote vs T-Shirt
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>Test Products:</h4>
        {testProducts.map(product => (
          <button
            key={product.id}
            onClick={() => onTestProduct(product.id)}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px',
              margin: '3px 0',
              backgroundColor: product.color,
              color: product.id.includes('tshirt') ? '#000' : '#FFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {product.name}
          </button>
        ))}
      </div>

      <button
        onClick={runDetectionTest}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '10px'
        }}
      >
        🔍 Run Color Detection Test
      </button>

      {testResults && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
          fontSize: '10px',
          whiteSpace: 'pre-line',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {testResults}
        </div>
      )}
    </div>
  );
};

export default ARTestOverlay;