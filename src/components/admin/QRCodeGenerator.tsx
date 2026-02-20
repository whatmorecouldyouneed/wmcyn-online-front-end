import React, { useState, useRef } from 'react';
import { ProductSet, RedeemPolicy, GenerateQRCodeRequest } from '@/types/productSets';
import { ARSessionData, MarkerPattern } from '@/types/arSessions';
import { generateQRCode, markerPatterns, arSessions } from '@/lib/apiClient';
import styles from '@/styles/Admin.module.scss';
import markerLabStyles from '@/styles/MarkerLab.module.scss';

interface QRCodeGeneratorProps {
  productSet?: ProductSet | null;
  arSession?: ARSessionData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (qrCode: any) => void;
}

export default function QRCodeGenerator({ productSet, arSession, isOpen, onClose, onSuccess }: QRCodeGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedQR, setGeneratedQR] = useState<any>(null);
  const [templateGenerated, setTemplateGenerated] = useState(false);
  
  // marker code state
  const [embedMarker, setEmbedMarker] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string>('');
  const [availableMarkers, setAvailableMarkers] = useState<MarkerPattern[]>([]);
  const [markerCodePreview, setMarkerCodePreview] = useState<string>('');
  const [generatingMarkerCode, setGeneratingMarkerCode] = useState(false);

  // form state
  const [policy, setPolicy] = useState<RedeemPolicy>({
    perUserLimit: 1,
    maxClaims: 100,
    geofence: undefined,
    timeWindow: undefined
  });

  const [expiresAt, setExpiresAt] = useState('');

  // load available markers when component mounts
  React.useEffect(() => {
    if (isOpen && embedMarker) {
      loadAvailableMarkers();
    }
  }, [isOpen, embedMarker]);

  const loadAvailableMarkers = async () => {
    try {
      console.log('[QRCodeGenerator] Loading marker patterns...');
      const response = await markerPatterns.list();
      console.log('[QRCodeGenerator] Raw response:', response);
      
      // handle different response structures
      let patterns: MarkerPattern[] = [];
      if (response && response.markerPatterns) {
        patterns = response.markerPatterns;
        console.log('[QRCodeGenerator] Using markerPatterns field:', patterns.length);
      } else if (response && (response as any).patterns) {
        patterns = (response as any).patterns;
        console.log('[QRCodeGenerator] Using patterns field:', patterns.length);
      } else if (response && Array.isArray(response)) {
        patterns = response as unknown as MarkerPattern[];
        console.log('[QRCodeGenerator] Using direct array response:', patterns.length);
      } else {
        console.warn('[QRCodeGenerator] Unexpected marker patterns response structure:', response);
        patterns = [];
      }
      
      // filter to markers with validation scores > 0 (all uploaded markers have score 100)
      const validatedMarkers = patterns.filter(
        (m) => (m.validation?.detectionScore ?? 0) > 0 || !m.validation
      );
      console.log('[QRCodeGenerator] Available markers (score > 0):', validatedMarkers.length);
      setAvailableMarkers(validatedMarkers);
    } catch (error) {
      console.error('Failed to load markers:', error);
    }
  };

  // generate marker code (QR with embedded marker)
  const generateMarkerCode = async (qrData: any, markerPattern: MarkerPattern) => {
    try {
      setGeneratingMarkerCode(true);
      
      // dynamic import for QR code library
      const QRCode = (await import('qrcode')).default;
      
      // create QR code with high error correction for logo embedding
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, qrData.qrUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H', // high error correction for logo
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // load marker image
      const markerImg = new Image();
      markerImg.crossOrigin = 'anonymous';
      
      return new Promise<string>((resolve, reject) => {
        markerImg.onload = () => {
          try {
            // create final canvas
            const finalCanvas = document.createElement('canvas');
            const ctx = finalCanvas.getContext('2d')!;
            finalCanvas.width = 400;
            finalCanvas.height = 400;
            
            // draw QR code
            ctx.drawImage(qrCanvas, 0, 0);
            
            // calculate marker size (28-32% of QR width)
            const markerSize = Math.floor(400 * 0.3);
            const markerX = (400 - markerSize) / 2;
            const markerY = (400 - markerSize) / 2;
            
            // add white border around marker
            const borderSize = 4;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(
              markerX - borderSize, 
              markerY - borderSize, 
              markerSize + (borderSize * 2), 
              markerSize + (borderSize * 2)
            );
            
            // draw marker
            ctx.drawImage(markerImg, markerX, markerY, markerSize, markerSize);
            
            const dataUrl = finalCanvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (error) {
            reject(error);
          }
        };
        
        // list of URLs to try in order
        const urlsToTry = [
          markerPattern.markerImageUrl,
          markerPattern.previewUrl
        ].filter((url): url is string => Boolean(url)); // remove undefined/null URLs
        
        let currentUrlIndex = 0;
        
        const tryNextUrl = () => {
          if (currentUrlIndex >= urlsToTry.length) {
            reject(new Error('Failed to load marker image from any URL - this may be due to CORS restrictions. Please check the image URLs and CORS settings.'));
            return;
          }
          
          const currentUrl = urlsToTry[currentUrlIndex];
          console.log(`Trying marker image URL ${currentUrlIndex + 1}/${urlsToTry.length}:`, currentUrl);
          markerImg.src = currentUrl;
        };
        
        markerImg.onerror = (error) => {
          console.error(`Failed to load marker image from URL ${currentUrlIndex + 1}:`, urlsToTry[currentUrlIndex]);
          console.error('Error:', error);
          
          currentUrlIndex++;
          tryNextUrl();
        };
        
        // start trying URLs
        tryNextUrl();
      });
      
    } catch (error) {
      console.error('Failed to generate marker code:', error);
      throw error;
    } finally {
      setGeneratingMarkerCode(false);
    }
  };

  // download marker code
  const downloadMarkerCode = async (format: 'png' | 'svg' | 'pdf') => {
    if (!generatedQR || !selectedMarker) return;
    
    const markerPattern = availableMarkers.find(m => m.id === selectedMarker);
    if (!markerPattern) return;
    
    try {
      if (format === 'png') {
        const dataUrl = await generateMarkerCode(generatedQR, markerPattern);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `marker-code-${generatedQR.code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // for SVG and PDF, we'd need additional libraries
        alert(`${format.toUpperCase()} export coming soon!`);
      }
    } catch (error) {
      console.error('Failed to download marker code:', error);
      alert('Failed to generate marker code');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSet && !arSession) return;

    setLoading(true);
    setError('');

    try {
      // determine the target type and ID based on what we have
      let targetType: "PRODUCT_SET" | "AR_SESSION";
      let targetId: string;
      
      if (productSet) {
        // use product set directly instead of trying to create AR session
        targetType = "PRODUCT_SET";
        targetId = productSet.id;
        console.log('[QRCodeGenerator] Using product set:', productSet.id);
      } else if (arSession) {
        // use existing AR session
        targetType = "AR_SESSION";
        targetId = arSession.sessionId;
        console.log('[QRCodeGenerator] Using AR session:', arSession.sessionId);
      } else {
        throw new Error('No product set or AR session available for QR code generation');
      }
      
      const request = {
        target: {
          type: targetType,
          ...(targetType === "PRODUCT_SET" ? { productSetId: targetId } : { sessionId: targetId })
        },
        label: productSet?.name || arSession?.metadata?.title || 'AR Session',
        campaign: productSet?.campaign || arSession?.campaign
      };

      console.log('[QRCodeGenerator] Sending request:', JSON.stringify(request, null, 2));
      
      const response = await generateQRCode(request as any);
      console.log('[QRCodeGenerator] Received response:', JSON.stringify(response, null, 2));
      
      // generate template files automatically via API
      try {
        const templateResponse = await fetch('/api/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: response.code,
            productName: request.label || 'Custom AR Experience',
            campaign: request.campaign || 'default',
            targetType: request.target.type,
            targetId:
              ('productSetId' in request.target
                ? request.target.productSetId
                : request.target.sessionId) || 'unknown',
            metadata: {
              title: request.label || 'Custom AR Experience',
              description: productSet?.description || arSession?.metadata?.description || 'Generated AR experience',
              effects: {
                type: 'default',
                intensity: 1.0,
                theme: 'default'
              }
            }
          })
        });
        
        if (templateResponse.ok) {
          const templateResult = await templateResponse.json();
          if (templateResult.success) {
            setTemplateGenerated(true);
            console.log('✅ Template generated for QR code:', response.code);
          } else {
            console.warn('⚠️ Template generation failed:', templateResult.error);
          }
        } else {
          console.warn('⚠️ Template generation failed:', templateResponse.status);
        }
      } catch (templateError) {
        console.warn('⚠️ Template generation failed:', templateError);
      }
      
      setGeneratedQR(response);
      console.log('[QRCodeGenerator] QR code generated successfully:', response.code);
      console.log('[QRCodeGenerator] QR URL:', response.qrUrl);
      onSuccess(response);
    } catch (err: any) {
      setError(err.message || 'failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGeneratedQR(null);
    setError('');
    setTemplateGenerated(false);
    setPolicy({
      perUserLimit: 1,
      maxClaims: 100,
      geofence: undefined,
      timeWindow: undefined
    });
    setExpiresAt('');
    onClose();
  };

  // download qr code as image
  const downloadQRCode = async (qrCode: any, format: 'svg' | 'png' = 'png') => {
    const url = format === 'svg' ? qrCode.assets.qrSvgUrl : qrCode.assets.qrPngUrl;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `qr-code-${qrCode.code}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert('Failed to download QR code');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader} style={{ position: 'relative' }}>
          <h2 className={styles.modalTitle}>
            generate QR code
            {productSet && (
              <span style={{ fontSize: '1rem', fontWeight: 'normal', opacity: 0.7 }}>
                {' '}for {productSet.name}
              </span>
            )}
            {arSession && (
              <span style={{ fontSize: '1rem', fontWeight: 'normal', opacity: 0.7 }}>
                {' '}for {arSession.metadata?.title || 'AR Session'}
              </span>
            )}
          </h2>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            style={{ 
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              e.currentTarget.style.background = 'none';
            }}
          >
            ×
          </button>
        </div>

        {generatedQR ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'white', marginBottom: '16px' }}>QR code generated successfully!</h3>
              <div style={{ 
                background: 'white', 
                padding: '16px', 
                borderRadius: '8px', 
                display: 'inline-block',
                marginBottom: '16px'
              }}>
                <img 
                  src={generatedQR.assets?.qrPngUrl} 
                  alt="Generated QR Code" 
                  style={{ maxWidth: '200px', height: 'auto' }}
                />
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '16px' }}>
                code: <strong>{generatedQR.code}</strong>
              </p>
              
              {/* QR URL display */}
              {generatedQR.qrUrl && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: 'white', fontSize: '0.9rem', marginBottom: '8px' }}>
                    QR URL:
                  </label>
                  <a 
                    href={generatedQR.qrUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'block', 
                      padding: '8px 12px', 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      borderRadius: '6px', 
                      color: '#60a5fa',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {generatedQR.qrUrl}
                  </a>
                </div>
              )}
              
              {/* Template generation status */}
              {templateGenerated && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '12px', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#10b981'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🎨</span>
                    <strong>Template Generated!</strong>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
                    AR template files created at: <code>src/ar/templates/{generatedQR.code}/</code>
                  </p>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Edit the files to customize your AR experience
                  </p>
                </div>
              )}
              
              {/* Download buttons */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'white', fontSize: '0.9rem', marginBottom: '8px' }}>
                  Download QR Code:
                </label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => downloadQRCode(generatedQR, 'png')}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => downloadQRCode(generatedQR, 'svg')}
                    style={{
                      padding: '8px 16px',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Download SVG
                  </button>
                </div>
              </div>
              
              {/* Marker Code Downloads */}
              {embedMarker && selectedMarker && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: 'white', fontSize: '0.9rem', marginBottom: '8px' }}>
                    Download Marker Code:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => downloadMarkerCode('png')}
                      disabled={generatingMarkerCode}
                      style={{
                        padding: '8px 16px',
                        background: generatingMarkerCode ? '#6b7280' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: generatingMarkerCode ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {generatingMarkerCode ? 'Generating...' : 'Download Marker Code PNG'}
                    </button>
                    <button
                      onClick={() => downloadMarkerCode('svg')}
                      disabled={true}
                      style={{
                        padding: '8px 16px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'not-allowed',
                        fontSize: '0.9rem'
                      }}
                    >
                      SVG (Coming Soon)
                    </button>
                    <button
                      onClick={() => downloadMarkerCode('pdf')}
                      disabled={true}
                      style={{
                        padding: '8px 16px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'not-allowed',
                        fontSize: '0.9rem'
                      }}
                    >
                      PDF (Coming Soon)
                    </button>
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedQR.qrUrl)}
                  className={styles.buttonSecondary}
                >
                  copy URL
                </button>
                <button 
                  onClick={handleClose}
                  className={styles.buttonPrimary}
                >
                  close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* basic limits */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>claim limits</h3>
              
              <div className={styles.formRow}>
                <div className={styles.formRowItem}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    per user limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={policy.perUserLimit}
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      perUserLimit: parseInt(e.target.value) || 1 
                    }))}
                    className={styles.inputField}
                    required
                  />
                </div>
                <div className={styles.formRowItem}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    max total claims
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={policy.maxClaims}
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      maxClaims: parseInt(e.target.value) || 1 
                    }))}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>
            </div>

            {/* geofence (optional) */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>geofence (optional)</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
                restrict claims to a specific location
              </p>
              
              <div className={styles.formRow}>
                <div className={styles.formRowItem}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 40.7128"
                    value={policy.geofence?.latitude || ''}
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      geofence: {
                        ...prev.geofence,
                        latitude: parseFloat(e.target.value) || 0,
                        longitude: prev.geofence?.longitude || 0,
                        radiusMeters: prev.geofence?.radiusMeters || 100
                      }
                    }))}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formRowItem}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., -74.0060"
                    value={policy.geofence?.longitude || ''}
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      geofence: {
                        ...prev.geofence,
                        latitude: prev.geofence?.latitude || 0,
                        longitude: parseFloat(e.target.value) || 0,
                        radiusMeters: prev.geofence?.radiusMeters || 100
                      }
                    }))}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formRowItem}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    radius (meters)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g., 100"
                    value={policy.geofence?.radiusMeters || ''}
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      geofence: {
                        ...prev.geofence,
                        latitude: prev.geofence?.latitude || 0,
                        longitude: prev.geofence?.longitude || 0,
                        radiusMeters: parseInt(e.target.value) || 100
                      }
                    }))}
                    className={styles.inputField}
                  />
                </div>
              </div>
            </div>

            {/* time window (optional) */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>time window (optional)</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
                restrict claims to a specific time period
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    start time
                  </label>
                  <input
                    type="datetime-local"
                    value={policy.timeWindow?.startTime ? 
                      new Date(policy.timeWindow.startTime).toISOString().slice(0, 16) : ''
                    }
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      timeWindow: {
                        ...prev.timeWindow,
                        startTime: e.target.value ? new Date(e.target.value).toISOString() : '',
                        endTime: prev.timeWindow?.endTime || ''
                      }
                    }))}
                    className={styles.inputField}
                    style={{ 
                      width: '100%', 
                      maxWidth: '100%',
                      minWidth: '0',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    end time
                  </label>
                  <input
                    type="datetime-local"
                    value={policy.timeWindow?.endTime ? 
                      new Date(policy.timeWindow.endTime).toISOString().slice(0, 16) : ''
                    }
                    onChange={(e) => setPolicy(prev => ({ 
                      ...prev, 
                      timeWindow: {
                        ...prev.timeWindow,
                        startTime: prev.timeWindow?.startTime || '',
                        endTime: e.target.value ? new Date(e.target.value).toISOString() : ''
                      }
                    }))}
                    className={styles.inputField}
                    style={{ 
                      width: '100%', 
                      maxWidth: '100%',
                      minWidth: '0',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* expiration */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>expiration (optional)</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
                when this QR code should expire
              </p>
              
              <input
                type="datetime-local"
                value={expiresAt ? new Date(expiresAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className={styles.inputField}
                style={{ width: '100%', maxWidth: '100%' }}
              />
            </div>

            {/* Marker Code Section */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>marker code (optional)</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
                embed a validated marker in the QR code center for combined AR experience
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '0.9rem'
                }}>
                  <input
                    type="checkbox"
                    checked={embedMarker}
                    onChange={(e) => {
                      setEmbedMarker(e.target.checked);
                      if (e.target.checked) {
                        loadAvailableMarkers();
                      } else {
                        setSelectedMarker('');
                        setMarkerCodePreview('');
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  embed validated marker in QR center (Marker Code)
                </label>
              </div>
              
              {embedMarker && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    select marker
                  </label>
                  <select
                    value={selectedMarker}
                    onChange={(e) => {
                      setSelectedMarker(e.target.value);
                      setMarkerCodePreview('');
                    }}
                    className={styles.inputField}
                    disabled={availableMarkers.length === 0}
                  >
                    <option value="">
                      {availableMarkers.length === 0 ? 'no validated markers available' : 'select marker...'}
                    </option>
                    {availableMarkers.map((marker) => (
                      <option key={marker.id} value={marker.id}>
                        {marker.name} (score: {marker.validation?.detectionScore || 'N/A'})
                      </option>
                    ))}
                  </select>
                  
                  {selectedMarker && (
                    <div style={{ marginTop: '12px' }}>
                      {/* Debug info */}
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        marginBottom: '8px',
                        padding: '4px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px'
                      }}>
                        <div>selectedMarker: {selectedMarker}</div>
                        <div>generatedQR: {generatedQR ? 'YES' : 'NO'}</div>
                        <div>availableMarkers: {availableMarkers.length}</div>
                        <div>button disabled: {(!generatedQR || generatingMarkerCode) ? 'YES' : 'NO'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          console.log('[QRCodeGenerator] Preview marker code clicked');
                          console.log('[QRCodeGenerator] generatedQR:', generatedQR);
                          console.log('[QRCodeGenerator] selectedMarker:', selectedMarker);
                          console.log('[QRCodeGenerator] availableMarkers.length:', availableMarkers.length);
                          console.log('[QRCodeGenerator] generatingMarkerCode:', generatingMarkerCode);
                          
                          if (!generatedQR) {
                            console.error('[QRCodeGenerator] No generated QR code available');
                            alert('Please generate a QR code first');
                            return;
                          }
                          
                          const markerPattern = availableMarkers.find(m => m.id === selectedMarker);
                          console.log('[QRCodeGenerator] markerPattern:', markerPattern);
                          
                          if (!markerPattern) {
                            console.error('[QRCodeGenerator] No marker pattern found for selected marker');
                            alert('Please select a marker first');
                            return;
                          }
                          
                          try {
                            console.log('[QRCodeGenerator] Generating marker code preview...');
                            const preview = await generateMarkerCode(generatedQR, markerPattern);
                            console.log('[QRCodeGenerator] Preview generated:', preview);
                            setMarkerCodePreview(preview);
                          } catch (error) {
                            console.error('[QRCodeGenerator] Failed to generate preview:', error);
                            alert(
                              'Failed to generate preview: ' +
                                (error instanceof Error ? error.message : String(error))
                            );
                          }
                        }}
                        disabled={!generatedQR || generatingMarkerCode}
                        className={styles.buttonSecondary}
                        style={{ 
                          marginBottom: '12px',
                          opacity: (!generatedQR || generatingMarkerCode) ? 0.5 : 1,
                          cursor: (!generatedQR || generatingMarkerCode) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {generatingMarkerCode ? 'generating...' : 'preview marker code'}
                      </button>
                      
                      {markerCodePreview && (
                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                          <img 
                            src={markerCodePreview} 
                            alt="Marker Code Preview" 
                            style={{ 
                              maxWidth: '200px', 
                              height: 'auto', 
                              border: '1px solid rgba(255, 255, 255, 0.2)', 
                              borderRadius: '4px' 
                            }}
                          />
                          <p style={{ 
                            fontSize: '0.8rem', 
                            color: 'rgba(255, 255, 255, 0.6)', 
                            marginTop: '8px' 
                          }}>
                            marker code preview
                          </p>
                          
                          {generatedQR && (
                            <div style={{ 
                              marginTop: '12px', 
                              padding: '8px', 
                              background: 'rgba(0, 0, 0, 0.3)', 
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}>
                              <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '4px 0' }}>
                                <strong>Test Path:</strong>
                              </p>
                              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '4px 0', wordBreak: 'break-all' }}>
                                {generatedQR.qrUrl}
                              </p>
                              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '4px 0' }}>
                                Use ngrok to test: <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 4px', borderRadius: '2px' }}>ngrok http 3000</code>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div style={{ 
                color: '#ff6b6b', 
                fontSize: '0.9rem', 
                textAlign: 'center',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: '6px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={handleClose}
                className={styles.buttonSecondary}
                disabled={loading}
              >
                cancel
              </button>
              <button 
                type="submit"
                className={styles.buttonPrimary}
                disabled={loading}
                style={{ 
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'generating...' : 'generate QR code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
