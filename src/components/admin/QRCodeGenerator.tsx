import { useState } from 'react';
import { ProductSet, RedeemPolicy, GenerateQRCodeRequest } from '@/types/productSets';
import { ARSessionData } from '@/types/arSessions';
import { generateQRCode } from '@/lib/apiClient';
import styles from '@/styles/Admin.module.scss';

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

  // form state
  const [policy, setPolicy] = useState<RedeemPolicy>({
    perUserLimit: 1,
    maxClaims: 100,
    geofence: undefined,
    timeWindow: undefined
  });

  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSet && !arSession) return;

    setLoading(true);
    setError('');

    try {
      // use the exact format the backend expects
      const request = {
        target: productSet ? {
          type: "PRODUCT_SET",
          productSetId: productSet.id,
          id: productSet.id  // backend requires both productSetId and id
        } : {
          type: "AR_SESSION", 
          sessionId: arSession!.sessionId,
          id: arSession!.sessionId  // backend requires both sessionId and id
        },
        label: productSet ? productSet.name : arSession?.metadata.title,
        campaign: productSet ? productSet.campaign : arSession?.campaign,
        redeemPolicy: {
          mode: "CLAIMABLE",
          requireAuth: true,
          oneClaimPerUser: policy.perUserLimit === 1,
          maxTotalClaims: policy.maxClaims
        }
      };

      const response = await generateQRCode(request as any);
      console.log('[QRCodeGenerator] Received response:', JSON.stringify(response, null, 2));
      
      // generate template files automatically via API
      try {
        const templateResponse = await fetch('/api/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: response.qrCode.code,
            productName: request.label || 'Custom AR Experience',
            campaign: request.campaign || 'default',
            targetType: request.target.type,
            targetId: request.target.productSetId || request.target.sessionId || 'unknown',
            metadata: {
              title: request.label || 'Custom AR Experience',
              description: productSet?.description || arSession?.metadata.description || 'Generated AR experience',
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
            console.log('✅ Template generated for QR code:', response.qrCode.code);
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
                {' '}for {arSession.metadata.title}
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
