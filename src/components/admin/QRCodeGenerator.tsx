import { useState, useRef } from 'react';
import { ProductSet, RedeemPolicy, GenerateQRCodeRequest } from '@/types/productSets';
import { ARSessionData } from '@/types/arSessions';
import { generateQRCode, arSessions } from '@/lib/apiClient';
import { QRCodeSVG } from 'qrcode.react';
import styles from '@/styles/Admin.module.scss';

// default wmcyn logo for embedding in qr codes - use a dark/colored version for visibility on white background
const DEFAULT_LOGO_URL = '/wmcyn_logo_condensed.png';

// helper function to copy text to clipboard (works on non-https too)
const copyToClipboard = async (text: string): Promise<boolean> => {
  // try modern clipboard api first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
    }
  }
  
  // fallback for non-https or older browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
};

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
  const qrRef = useRef<HTMLDivElement>(null);

  // form state
  const [policy, setPolicy] = useState<RedeemPolicy>({
    perUserLimit: 1,
    maxClaims: 100,
    geofence: undefined,
    timeWindow: undefined
  });

  const [expiresAt, setExpiresAt] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // get the logo url to use for the qr code
  const getLogoUrl = () => {
    if (customLogoUrl) return customLogoUrl;
    if (logoPreview) return logoPreview;
    if (arSession?.markerPattern?.previewUrl) return arSession.markerPattern.previewUrl;
    return DEFAULT_LOGO_URL;
  };
  
  // handle custom logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // download qr code with embedded image as png
  const downloadQRWithLogo = async (format: 'png' | 'svg' = 'png') => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    
    if (format === 'svg') {
      // download as svg
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${generatedQR.qrCode?.code || generatedQR.code}-with-logo.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // download as png
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width * 2; // 2x for higher resolution
        canvas.height = img.height * 2;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `qr-code-${generatedQR.qrCode?.code || generatedQR.code}-with-logo.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        }
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

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
        label: productSet ? productSet.name : (arSession?.metadata?.title || arSession?.name || 'AR Experience'),
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
        // resolve marker pattern url - try multiple sources
        let markerPatternUrl = '/patterns/pattern-wmcyn_logo_full.patt';
        
        // 1. if we have an ar session directly, use its marker pattern
        if (arSession?.markerPattern?.url) {
          markerPatternUrl = arSession.markerPattern.url;
        } else if (arSession?.markerPattern?.patternId) {
          markerPatternUrl = `/patterns/${arSession.markerPattern.patternId}.patt`;
        }
        // 2. if we have a product set with linked ar session, fetch that session's marker
        else if (productSet?.linkedARSessionId) {
          console.log('[QRCodeGenerator] Fetching linked AR session marker:', productSet.linkedARSessionId);
          try {
            const sessionsResponse = await arSessions.list();
            const sessions = Array.isArray(sessionsResponse) 
              ? sessionsResponse 
              : (sessionsResponse?.sessions || sessionsResponse?.arSessions || []);
            const linkedSession = sessions.find((s: any) => 
              (s.sessionId || s.id) === productSet.linkedARSessionId
            );
            if (linkedSession?.markerPattern?.url) {
              markerPatternUrl = linkedSession.markerPattern.url;
              console.log('[QRCodeGenerator] Using linked session marker:', markerPatternUrl);
            } else if (linkedSession?.markerPattern?.patternId) {
              markerPatternUrl = `/patterns/${linkedSession.markerPattern.patternId}.patt`;
              console.log('[QRCodeGenerator] Using linked session pattern ID:', markerPatternUrl);
            }
          } catch (fetchError) {
            console.warn('[QRCodeGenerator] Failed to fetch linked session:', fetchError);
          }
        }
        
        console.log('[QRCodeGenerator] Generating template with marker:', markerPatternUrl);
        
        const templateResponse = await fetch('/api/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: response.qrCode.code,
            productName: request.label || 'Custom AR Experience',
            campaign: request.campaign || 'default',
            targetType: request.target.type,
            targetId: request.target.productSetId || request.target.sessionId || 'unknown',
            markerPatternUrl: markerPatternUrl,
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
    setCustomLogoUrl('');
    setLogoPreview(null);
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
              
              {/* qr code with embedded logo image */}
              <div 
                ref={qrRef}
                style={{ 
                  background: 'white', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  display: 'inline-block',
                  marginBottom: '16px'
                }}
              >
                <QRCodeSVG
                  value={generatedQR.qrUrl || `https://wmcyn.online/ar/${generatedQR.qrCode?.code || generatedQR.code}`}
                  size={200}
                  level="H" // high error correction to allow for logo
                  includeMargin={true}
                  imageSettings={{
                    src: getLogoUrl(),
                    x: undefined,
                    y: undefined,
                    height: 50,
                    width: 50,
                    excavate: true, // removes qr code data behind the image
                  }}
                />
              </div>
              
              {/* show which logo is being used */}
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginBottom: '8px' }}>
                Logo source: {logoPreview ? 'Uploaded image' : (customLogoUrl ? 'Custom URL' : (arSession?.markerPattern?.previewUrl ? 'Marker pattern' : 'Default WMCYN logo'))}
              </p>
              
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '8px' }}>
                code: <strong>{generatedQR.qrCode?.code || generatedQR.code}</strong>
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginBottom: '16px' }}>
                QR code includes embedded {arSession?.markerPattern?.name || 'WMCYN logo'}
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
                    AR template files created at: <code>src/ar/templates/{generatedQR.qrCode?.code || generatedQR.code}/</code>
                  </p>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Edit the files to customize your AR experience
                  </p>
                </div>
              )}
              
              {/* Download buttons */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'white', fontSize: '0.9rem', marginBottom: '8px' }}>
                  Download QR Code (with embedded logo):
                </label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => downloadQRWithLogo('png')}
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
                    onClick={() => downloadQRWithLogo('svg')}
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
              
              {/* Alternative: Download backend-generated QR (without embedded logo) */}
              {(generatedQR.qrCode?.assets?.qrPngUrl || generatedQR.assets?.qrPngUrl) && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginBottom: '8px' }}>
                    Or download plain QR (without logo):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => downloadQRCode(generatedQR.qrCode || generatedQR, 'png')}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Plain PNG
                    </button>
                    <button
                      onClick={() => downloadQRCode(generatedQR.qrCode || generatedQR, 'svg')}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Plain SVG
                    </button>
                  </div>
                </div>
              )}
              
              {/* Test AR locally section */}
              {(() => {
                const qrCode = generatedQR.qrCode?.code || generatedQR.code;
                if (!qrCode) return null;
                const testUrl = `http://localhost:3000/ar/${encodeURIComponent(qrCode)}`;
                return (
                  <div style={{
                    marginBottom: '16px',
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#60a5fa', fontSize: '1rem' }}>
                      🎯 test your AR marker
                    </h4>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>
                        localhost test URL
                      </div>
                      <code style={{
                        display: 'block',
                        padding: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        wordBreak: 'break-all',
                        color: '#a5b4fc'
                      }}>
                        {testUrl}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={`/ar/${encodeURIComponent(qrCode)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.buttonPrimary}
                        style={{ 
                          textDecoration: 'none', 
                          padding: '10px 16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🚀</span> open AR test page
                      </a>
                      <button
                        onClick={async () => {
                          const success = await copyToClipboard(testUrl);
                          alert(success ? 'URL copied to clipboard!' : 'Failed to copy URL');
                        }}
                        className={styles.buttonSecondary}
                        style={{ padding: '10px 16px' }}
                      >
                        copy test URL
                      </button>
                    </div>
                    <p style={{
                      margin: '12px 0 0 0',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.75rem'
                    }}>
                      💡 point your camera at the marker image to see the AR experience
                    </p>
                  </div>
                );
              })()}
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={async () => {
                    const success = await copyToClipboard(generatedQR.qrUrl);
                    if (success) alert('URL copied!');
                  }}
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
            {/* custom logo for qr code */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>QR code logo (optional)</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Upload an image to embed in the center of the QR code
              </p>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* file upload */}
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    upload image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                {/* or use url */}
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                    or enter image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>
              
              {/* preview */}
              {(logoPreview || customLogoUrl) && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginBottom: '8px' }}>
                    Logo preview:
                  </p>
                  <div style={{ 
                    display: 'inline-block', 
                    padding: '8px', 
                    background: 'white', 
                    borderRadius: '8px' 
                  }}>
                    <img 
                      src={logoPreview || customLogoUrl} 
                      alt="Logo preview" 
                      style={{ 
                        maxWidth: '80px', 
                        maxHeight: '80px',
                        display: 'block'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      setCustomLogoUrl('');
                    }}
                    style={{
                      display: 'block',
                      margin: '8px auto 0',
                      padding: '4px 12px',
                      background: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.5)',
                      borderRadius: '4px',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    clear
                  </button>
                </div>
              )}
            </div>
            
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
