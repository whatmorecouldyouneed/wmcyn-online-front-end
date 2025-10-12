import React, { useState } from 'react';
// import { generateQRWithAutoTemplate } from '@/ar/adminIntegration';

interface QRGeneratorWithTemplateProps {
  onQRGenerated?: (qrData: any) => void;
}

export const QRGeneratorWithTemplate: React.FC<QRGeneratorWithTemplateProps> = ({ onQRGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      // example: generate QR for Memorial Day Tee
      const qrRequest = {
        target: {
          type: "PRODUCT_SET",
          productSetId: "memorial-tee-001"
        },
        label: "Memorial Day Tee",
        campaign: "memorial-day-2024",
        metadata: {
          description: "Patriotic AR experience with rain effects"
        }
      };

      // const qrData = await generateQRWithAutoTemplate(qrRequest);
      const qrData = await Promise.resolve({ code: 'MOCK123', qrUrl: 'https://example.com/qr' });
      
      setResult(qrData);
      onQRGenerated?.(qrData);
      
      console.log('✅ QR generated with template:', qrData);
    } catch (error) {
      console.error('❌ QR generation failed:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, border: '1px solid #ccc', borderRadius: 8, margin: 16 }}>
      <h3>QR Generator with Auto-Template</h3>
      
      <button 
        onClick={handleGenerateQR}
        disabled={loading}
        style={{
          padding: '12px 24px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Generating...' : 'Generate QR + Template'}
      </button>

      {result && (
        <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
          {result.error ? (
            <div style={{ color: 'red' }}>
              <strong>Error:</strong> {result.error}
            </div>
          ) : (
            <div>
              <h4>✅ QR Code Generated</h4>
              <p><strong>Code:</strong> {result.code}</p>
              <p><strong>Label:</strong> {result.label}</p>
              <p><strong>Campaign:</strong> {result.campaign}</p>
              
              {result.template?.generated && (
                <div style={{ marginTop: 12, padding: 12, background: '#e8f5e8', borderRadius: 4 }}>
                  <h5>🎨 Template Generated</h5>
                  <p><strong>Path:</strong> {result.template.path}</p>
                  <p><strong>Product:</strong> {result.template.config.productName}</p>
                  
                  <div style={{ marginTop: 8 }}>
                    <strong>Files Created:</strong>
                    <ul style={{ margin: 4, paddingLeft: 20 }}>
                      <li>index.tsx - Main AR component</li>
                      <li>effects.tsx - Custom effects (rain, particles)</li>
                      <li>config.json - Configuration</li>
                      <li>README.md - Instructions</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: 8 }}>
                    <strong>Next Steps:</strong>
                    <ol style={{ margin: 4, paddingLeft: 20 }}>
                      <li>Edit <code>effects.tsx</code> to customize rain/particles</li>
                      <li>Modify <code>config.json</code> for intensity/colors</li>
                      <li>Test at <code>/ar/{result.code}</code></li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRGeneratorWithTemplate;

