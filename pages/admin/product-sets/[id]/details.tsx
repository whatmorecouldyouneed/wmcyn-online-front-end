import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { getProductSet, getQRCodes, deleteQRCode, arSessions } from '@/lib/apiClient';
import { ProductSet, QRCodeData } from '@/types/productSets';
import { ARSessionData } from '@/types/arSessions';
import QRCodeGenerator from '@/components/admin/QRCodeGenerator';
import NFTMarkerCompiler from '@/components/admin/NFTMarkerCompiler';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function ProductSetDetails() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { id } = router.query;
  const [productSet, setProductSet] = useState<ProductSet | null>(null);
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([]);
  const [linkedARSession, setLinkedARSession] = useState<ARSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [deletingQR, setDeletingQR] = useState<string | null>(null);
  const [uploadingMarker, setUploadingMarker] = useState(false);
  const [markerError, setMarkerError] = useState<string | null>(null);

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // load data
  useEffect(() => {
    if (isAuthenticated && id && typeof id === 'string') {
      loadData(id);
    }
  }, [isAuthenticated, id]);

  const loadData = async (productSetId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const [productSetData, qrCodesData] = await Promise.all([
        getProductSet(productSetId),
        getQRCodes(productSetId)
      ]);
      
      setProductSet(productSetData);
      
      // handle different response structures
      let qrCodesArray: QRCodeData[] = [];
      if (Array.isArray(qrCodesData)) {
        qrCodesArray = qrCodesData;
      } else if (qrCodesData?.qrcodes) {
        qrCodesArray = qrCodesData.qrcodes;
      } else if (qrCodesData?.qrCodes) {
        qrCodesArray = qrCodesData.qrCodes;
      } else if (qrCodesData?.items) {
        qrCodesArray = qrCodesData.items;
      } else if (qrCodesData?.data) {
        qrCodesArray = Array.isArray(qrCodesData.data) ? qrCodesData.data : [];
      }
      setQRCodes(qrCodesArray);
      
      // fetch linked ar session if exists
      if (productSetData.linkedARSessionId) {
        try {
          const sessionsResponse = await arSessions.list();
          const sessions = Array.isArray(sessionsResponse) 
            ? sessionsResponse 
            : (sessionsResponse?.sessions || sessionsResponse?.arSessions || []);
          const session = sessions.find((s: ARSessionData) => 
            (s.sessionId || s.id) === productSetData.linkedARSessionId
          );
          if (session) {
            setLinkedARSession(session);
          }
        } catch (sessionError) {
          console.warn('failed to load linked AR session:', sessionError);
        }
      }
    } catch (err: any) {
      console.error('failed to load data:', err);
      setError(err.message || 'failed to load product set details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQR = async (qrCodeId: string) => {
    if (!confirm('are you sure you want to delete this QR code? this action cannot be undone.')) {
      return;
    }

    setDeletingQR(qrCodeId);
    try {
      await deleteQRCode(qrCodeId);
      setQRCodes(prev => prev.filter(qr => qr.id !== qrCodeId));
    } catch (error: any) {
      console.error('failed to delete QR code:', error);
      alert('failed to delete QR code. please try again.');
    } finally {
      setDeletingQR(null);
    }
  };

  // download QR code image with CORS handling
  const handleDownloadQR = async (url: string, filename: string) => {
    try {
      // try direct download first (works if CORS allows)
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      // fallback: fetch and download (handles CORS)
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (fetchError) {
        console.error('failed to download QR code:', fetchError);
        // final fallback: open in new tab
        window.open(url, '_blank');
      }
    }
  };

  const handleQRSuccess = (response: any) => {
    console.log('[handleQRSuccess] QR code generated:', response);
    
    // add the newly generated qr code directly to state
    if (response?.qrCode) {
      setQRCodes(prev => {
        // avoid duplicates
        const exists = prev.some(qr => qr.id === response.qrCode.id || qr.code === response.qrCode.code);
        if (exists) {
          return prev;
        }
        return [...prev, response.qrCode];
      });
    }
    
    // also refresh from api after a short delay to ensure consistency
    if (id && typeof id === 'string') {
      setTimeout(() => {
        getQRCodes(id).then(apiResponse => {
          console.log('[handleQRSuccess] API refresh response:', apiResponse);
          if (apiResponse?.qrCodes && apiResponse.qrCodes.length > 0) {
            setQRCodes(apiResponse.qrCodes);
          }
        }).catch(console.error);
      }, 1000);
    }
  };

  // handle marker compiled - receives compiled .mind file from browser
  const handleMarkerCompiled = async (data: {
    mindFileData: string;      // base64 encoded .mind file
    sourceImageData: string;   // base64 encoded source image
    filename: string;
    quality?: number;
  }) => {
    if (!productSet?.id) return;

    console.log('[handleMarkerCompiled] Uploading compiled marker to backend...');
    setUploadingMarker(true);
    setMarkerError(null);

    try {
      // upload to backend
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
      const url = `${API_BASE}/v1/productSets/${productSet.id}/nft-marker`;
      
      console.log('[handleMarkerCompiled] Uploading to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || '',
        },
        body: JSON.stringify({
          sourceImageData: data.sourceImageData,
          mindFileData: data.mindFileData,
          filename: data.filename,
          quality: data.quality,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[handleMarkerCompiled] Upload failed:', { status: response.status, text });
        throw new Error(`Upload failed: ${response.status} - ${text}`);
      }

      const result = await response.json();
      console.log('[handleMarkerCompiled] Upload result:', result);

      // update product set with new marker info
      setProductSet(prev => prev ? {
        ...prev,
        nftMarker: {
          mindFileUrl: result.mindFileUrl,
          sourceImageUrl: result.sourceImageUrl,
          compiledAt: new Date().toISOString(),
          quality: data.quality
        }
      } : null);

      // show success notification
      alert(`✓ Marker uploaded successfully!\n\nMind file: ${result.mindFileUrl}`);

    } catch (err: any) {
      console.error('[handleMarkerCompiled] Upload error:', err);
      setMarkerError(err.message || 'Failed to upload marker');
    } finally {
      setUploadingMarker(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPolicy = (policy: any) => {
    const parts = [];
    
    if (policy.geofence) {
      parts.push(`location: ${policy.geofence.latitude.toFixed(4)}, ${policy.geofence.longitude.toFixed(4)} (±${policy.geofence.radiusMeters}m)`);
    }
    
    if (policy.timeWindow) {
      const start = new Date(policy.timeWindow.startTime).toLocaleDateString();
      const end = new Date(policy.timeWindow.endTime).toLocaleDateString();
      parts.push(`time: ${start} - ${end}`);
    }
    
    parts.push(`per user: ${policy.perUserLimit}`);
    parts.push(`max claims: ${policy.maxClaims}`);
    
    return parts.join(' • ');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.loadingContainer}>
            {loading ? 'loading product set details...' : 'loading...'}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // will redirect
  }

  if (error) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.errorContainer}>
            {error}
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.buttonSecondary}
            >
              back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!productSet) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.emptyState}>
            <h2 className={styles.emptyStateTitle}>product set not found</h2>
            <p className={styles.emptyStateDescription}>
              the product set you&apos;re looking for doesn&apos;t exist or has been deleted
            </p>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.buttonPrimary}
            >
              back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.adminContainer}>
        {/* header */}
        <div className={styles.adminHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <NextImage
              src={WMCYNLOGO}
              alt="WMCYN Logo"
              width={80}
              height={40}
              priority
            />
            <h1 className={styles.adminTitle}>product set details</h1>
          </div>
          <div className={styles.adminActions}>
            <button 
              onClick={() => setShowQRGenerator(true)}
              className={styles.buttonPrimary}
            >
              generate QR code
            </button>
            <button 
              onClick={() => router.push(`/admin/product-sets/${productSet.id}`)}
              className={styles.buttonSecondary}
            >
              edit
            </button>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.buttonSecondary}
            >
              back to dashboard
            </button>
          </div>
        </div>

        {/* product set info */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '32px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '16px', fontSize: '1.5rem' }}>
            {productSet.name}
          </h2>
          
          {productSet.description && (
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px', lineHeight: '1.5' }}>
              {productSet.description}
            </p>
          )}
          
          {productSet.campaign && (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
              <strong>campaign:</strong> {productSet.campaign}
            </p>
          )}

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'white' }}>
                {productSet.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                total items
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'white' }}>
                {productSet.stats?.totalClaims || 0}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                total claims
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'white' }}>
                {productSet.stats?.remainingInventory || 0}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                remaining inventory
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'white' }}>
                {(qrCodes || []).length > 0 ? '1' : '0'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                QR code status
              </div>
            </div>
          </div>

          <div style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            paddingTop: '16px',
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            created {formatDate(productSet.createdAt)}
            {productSet.updatedAt !== productSet.createdAt && (
              <span> • updated {formatDate(productSet.updatedAt)}</span>
            )}
          </div>
        </div>

        {/* test ar experience section */}
        {(productSet.linkedARSessionId || (qrCodes && qrCodes.length > 0)) && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15))',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ 
              color: 'white', 
              marginBottom: '16px', 
              fontSize: '1.1rem', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1.3rem' }}>🎯</span>
              test AR experience
            </h3>
            
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '0.9rem', 
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              test your AR marker detection. point your camera at the uploaded marker image to see the 3D WMCYN logo.
            </p>

            {/* linked ar session info */}
            {linkedARSession && (
              <div style={{ 
                marginBottom: '20px',
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '500', marginBottom: '4px' }}>
                  ✓ linked AR session
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  {linkedARSession.metadata?.title || linkedARSession.name || 'AR Session'}
                  {linkedARSession.markerPattern?.name && (
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', marginLeft: '8px' }}>
                      • marker: {linkedARSession.markerPattern.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* test links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* qr code test link (primary - this is what users should use) */}
              {qrCodes && qrCodes.length > 0 && (() => {
                const qrCode = qrCodes[0].code;
                const testUrl = `http://localhost:3000/ar/${encodeURIComponent(qrCode)}`;
                return (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '500' }}>
                        ✓ QR code test link (recommended)
                      </div>
                      <code style={{ 
                        color: '#60a5fa', 
                        fontSize: '0.85rem',
                        wordBreak: 'break-all',
                        display: 'block',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px'
                      }}>
                        {testUrl}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`/ar/${encodeURIComponent(qrCode)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.buttonPrimary}
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '8px 16px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🚀</span> open AR
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(testUrl);
                          alert('URL copied to clipboard!');
                        }}
                        className={styles.buttonSecondary}
                        style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                      >
                        copy
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ar session test link (fallback) */}
              {productSet.linkedARSessionId && (() => {
                const sessionId = productSet.linkedARSessionId;
                const testUrl = `http://localhost:3000/ar/${encodeURIComponent(sessionId)}`;
                return (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginBottom: '4px' }}>
                        AR session link (dev)
                      </div>
                      <code style={{ 
                        color: '#60a5fa', 
                        fontSize: '0.85rem',
                        wordBreak: 'break-all',
                        display: 'block',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px'
                      }}>
                        {testUrl}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`/ar/${encodeURIComponent(sessionId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.buttonPrimary}
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '8px 16px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🚀</span> open AR
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(testUrl);
                          alert('URL copied to clipboard!');
                        }}
                        className={styles.buttonSecondary}
                        style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                      >
                        copy
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* testing instructions */}
            <div style={{ 
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '8px'
            }}>
              <div style={{ 
                color: '#fbbf24', 
                fontSize: '0.85rem', 
                fontWeight: '500', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>💡</span> testing tips
              </div>
              <ul style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '0.85rem', 
                margin: 0,
                paddingLeft: '20px',
                lineHeight: '1.6'
              }}>
                <li>open the AR link on your phone or use chrome devtools mobile emulator</li>
                <li>allow camera access when prompted</li>
                <li>point camera at the marker image you uploaded</li>
                <li>the 3D WMCYN logo should appear when marker is detected</li>
              </ul>
            </div>
          </div>
        )}

        {/* items list */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.1rem', fontWeight: '600', textAlign: 'center' }}>items</h3>
          {productSet.items && productSet.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {productSet.items.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  gap: '16px'
                }}>
                  <span style={{ color: 'white', fontWeight: '500', fontSize: '1rem', flex: 1 }}>{item.productId}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', fontWeight: '500', minWidth: '80px', textAlign: 'right' }}>qty: {item.quantity || 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '32px 24px',
              color: 'rgba(255, 255, 255, 0.6)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '12px', opacity: 0.5 }}>📦</div>
              <p style={{ margin: '0', fontSize: '0.9rem' }}>no items configured</p>
            </div>
          )}
        </div>

        {/* checkout config */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.1rem', fontWeight: '600' }}>checkout configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px'
            }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>type:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{productSet.checkout?.type || 'N/A'}</span>
            </div>
            {productSet.checkout?.cartLink && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>cart link:</span>
                <a 
                  href={productSet.checkout?.cartLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#667eea', 
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  }}
                >
                  view link
                </a>
              </div>
            )}
            {productSet.checkout?.discountCode && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>discount code:</span>
                <span style={{ color: 'white', fontWeight: '500' }}>{productSet.checkout?.discountCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* NFT marker section */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          backdropFilter: 'blur(10px)'
        }}>
          {markerError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#fca5a5',
              fontSize: '0.9rem'
            }}>
              {markerError}
            </div>
          )}
          
          {uploadingMarker && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#93c5fd',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              uploading marker to server...
            </div>
          )}
          
          <NFTMarkerCompiler
            productSetId={productSet.id}
            onCompiled={handleMarkerCompiled}
            existingMarker={productSet.nftMarker}
            disabled={uploadingMarker}
          />
        </div>

        {/* QR codes */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>QR code</h3>
            {(qrCodes || []).length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowQRGenerator(true)}
                  className={styles.buttonPrimary}
                  style={{ fontSize: '0.9rem', padding: '10px 16px' }}
                >
                  generate QR code
                </button>
              </div>
            )}
          </div>

          {(qrCodes || []).length > 0 ? (
            <div>
              {(qrCodes || []).slice(0, 1).map((qrCode) => {
                console.log('[ProductSetDetails] Rendering QR code:', qrCode);
                return (
                <div key={qrCode.id} style={{ 
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>
                        {qrCode.code}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        created {formatDate(qrCode.createdAt)}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteQR(qrCode.id)}
                      disabled={deletingQR === qrCode.id}
                      className={styles.buttonDanger}
                      style={{ 
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        opacity: deletingQR === qrCode.id ? 0.6 : 1
                      }}
                    >
                      {deletingQR === qrCode.id ? 'deleting...' : 'delete'}
                    </button>
                  </div>

                  {/* QR code image display - always show */}
                  {(() => {
                    // get asset URLs - use provided or construct from code
                    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
                    const pngUrl = qrCode.assets?.qrPngUrl || `https://api-rrm3u3yaba-uc.a.run.app/api/qr-assets/${qrCode.code}.png`;
                    const svgUrl = qrCode.assets?.qrSvgUrl || `https://api-rrm3u3yaba-uc.a.run.app/api/qr-assets/${qrCode.code}.svg`;
                    
                    return (
                      <div style={{ 
                        textAlign: 'center', 
                        marginBottom: '16px',
                        padding: '16px',
                        background: 'white',
                        borderRadius: '8px'
                      }}>
                        <img 
                          src={pngUrl} 
                          alt={`QR Code ${qrCode.code}`}
                          onError={(e) => {
                            // fallback to SVG if PNG fails
                            if (e.currentTarget.src !== svgUrl) {
                              e.currentTarget.src = svgUrl;
                            }
                          }}
                          style={{ 
                            maxWidth: '200px', 
                            width: '100%', 
                            height: 'auto',
                            display: 'block',
                            margin: '0 auto'
                          }}
                        />
                        
                        {/* download buttons - always show */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          justifyContent: 'center',
                          marginTop: '12px'
                        }}>
                          <button
                            onClick={() => handleDownloadQR(pngUrl, `qr-code-${qrCode.code}.png`)}
                            style={{
                              padding: '8px 16px',
                              background: '#000',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}
                          >
                            download png
                          </button>
                          <button
                            onClick={() => handleDownloadQR(svgUrl, `qr-code-${qrCode.code}.svg`)}
                            style={{
                              padding: '8px 16px',
                              background: '#000',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}
                          >
                            download svg
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* QR code URL */}
                  <div style={{ 
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '4px'
                    }}>
                      QR code URL:
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <code style={{ 
                        flex: 1,
                        padding: '6px 8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '4px',
                        color: '#60a5fa',
                        fontSize: '0.85rem',
                        wordBreak: 'break-all',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {`https://wmcyn.online/qr?code=${qrCode.code}`}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://wmcyn.online/qr?code=${qrCode.code}`);
                          alert('URL copied to clipboard!');
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        copy
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                        {qrCode.stats?.claimsUsed || 0}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        claims used
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                        {qrCode.stats?.remainingClaims || 0}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        remaining
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.4'
                  }}>
                    {formatPolicy(qrCode.redeemPolicy || {})}
                  </div>

                  {qrCode.expiresAt && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: 'rgba(255, 107, 107, 0.8)',
                      marginTop: '8px'
                    }}>
                      expires: {formatDate(qrCode.expiresAt)}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 32px',
              color: 'rgba(255, 255, 255, 0.6)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px', opacity: 0.5 }}>📱</div>
              <p style={{ marginBottom: '0', fontSize: '1rem' }}>no QR code generated yet</p>
            </div>
          )}
        </div>

        {/* QR code generator modal */}
        <QRCodeGenerator
          productSet={productSet}
          isOpen={showQRGenerator}
          onClose={() => setShowQRGenerator(false)}
          onSuccess={handleQRSuccess}
        />
      </div>
    </div>
  );
}
