import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { createProductSet, arSessions } from '@/lib/apiClient';
import { CreateProductSetRequest } from '@/types/productSets';
import { CreateARSessionRequest } from '@/types/arSessions';
import ARProductBuilder from '@/components/admin/ARProductBuilder';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function CreateProductSet() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdData, setCreatedData] = useState<{
    productSetId: string;
    arSessionId: string | null;
    name: string;
  } | null>(null);

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    campaign: string;
    markerPatternId: string;
    arTitle: string;
    arDescription: string;
    arActions: Array<{ type: string; label: string; url?: string }>;
  }) => {
    try {
      setLoading(true);
      
      // step 1: create ar session first with marker pattern and metadata
      console.log('[CreateProductSet] Step 1: Creating AR Session...');
      const arSessionData: CreateARSessionRequest = {
        name: data.name,
        description: data.arDescription || data.description,
        campaign: data.campaign || undefined,
        productId: 'ar-product',
        markerPattern: {
          patternId: data.markerPatternId,
          type: 'custom'
        },
        metadata: {
          title: data.arTitle || data.name,
          description: data.arDescription || data.description || '',
          actions: data.arActions.map(action => ({
            type: action.type as 'purchase' | 'share' | 'claim' | 'info',
            label: action.label,
            url: action.url
          }))
        }
      };
      
      console.log('[CreateProductSet] AR Session data:', arSessionData);
      
      let arSession;
      try {
        arSession = await arSessions.create(arSessionData);
        console.log('[CreateProductSet] AR Session created:', arSession);
      } catch (arError: any) {
        console.error('[CreateProductSet] AR Session creation failed:', arError);
        // continue without ar session if it fails - product can still be created
        console.log('[CreateProductSet] Continuing without AR session...');
      }
      
      // step 2: create product set linked to ar session
      console.log('[CreateProductSet] Step 2: Creating Product Set...');
      const productSetData: CreateProductSetRequest = {
        name: data.name,
        description: data.description || undefined,
        campaign: data.campaign || undefined,
        items: [{ 
          productId: data.markerPatternId || 'ar-product', 
          quantity: 1 
        }],
        checkout: {
          type: 'product'
        },
        // link to ar session if created
        linkedARSessionId: arSession?.sessionId || arSession?.id
      };
      
      console.log('[CreateProductSet] Product Set data:', productSetData);
      
      const productSet = await createProductSet(productSetData);
      console.log('[CreateProductSet] Product set created:', productSet);
      
      // step 3: generate template for the ar session
      if (arSession) {
        console.log('[CreateProductSet] Step 3: Generating AR template...');
        try {
          const templateResponse = await fetch('/api/generate-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: arSession.sessionId || arSession.id,
              productName: data.arTitle || data.name,
              campaign: data.campaign || 'default',
              targetType: 'AR_SESSION',
              targetId: arSession.sessionId || arSession.id,
              markerPatternUrl: arSession.markerPattern?.url || 
                `/patterns/${data.markerPatternId}.patt`,
              metadata: {
                title: data.arTitle || data.name,
                description: data.arDescription || data.description || '',
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
            console.log('[CreateProductSet] Template generated:', templateResult);
          } else {
            console.warn('[CreateProductSet] Template generation failed:', templateResponse.status);
          }
        } catch (templateError) {
          console.warn('[CreateProductSet] Template generation error:', templateError);
        }
      }
      
      // show success modal with test link
      setCreatedData({
        productSetId: productSet.id,
        arSessionId: arSession?.sessionId || arSession?.id || null,
        name: data.name
      });
      setShowSuccess(true);
    } catch (error: any) {
      console.error('[CreateProductSet] Failed to create AR product:', error);
      alert(`Failed to create AR product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    if (createdData) {
      router.push(`/admin/product-sets/${createdData.productSetId}/details`);
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  if (authLoading) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.loadingContainer}>
            loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // will redirect
  }

  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.adminContainer}>
        {/* header */}
        <div className={styles.adminHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NextImage
              src={WMCYNLOGO}
              alt="WMCYN Logo"
              width={80}
              height={40}
              priority
            />
            <h1 className={styles.adminTitle}>create AR product</h1>
          </div>
          <button 
            onClick={handleCancel}
            className={styles.buttonSecondary}
          >
            back to dashboard
          </button>
        </div>

        {/* form */}
            <ARProductBuilder
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading}
            />

        {/* success modal */}
        {showSuccess && createdData && (
          <div 
            className={styles.modalOverlay}
            onClick={handleCloseSuccess}
          >
            <div 
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px' }}
            >
              <div style={{ textAlign: 'center', padding: '24px' }}>
                {/* success icon */}
                <div style={{ 
                  fontSize: '4rem', 
                  marginBottom: '16px',
                  animation: 'pulse 1s infinite'
                }}>
                  🎉
                </div>
                
                <h2 style={{ 
                  color: 'white', 
                  marginBottom: '8px',
                  fontSize: '1.5rem'
                }}>
                  AR product created!
                </h2>
                
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  marginBottom: '24px',
                  fontSize: '1rem'
                }}>
                  &quot;{createdData.name}&quot; is ready to test
                </p>

                {/* test ar section */}
                {createdData.arSessionId && (() => {
                  const sessionId = createdData.arSessionId;
                  const testUrl = `http://localhost:3000/ar/${encodeURIComponent(sessionId)}`;
                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                      border: '1px solid rgba(102, 126, 234, 0.4)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      textAlign: 'left'
                    }}>
                      <h3 style={{ 
                        color: 'white', 
                        marginBottom: '12px',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>🎯</span> test your AR marker
                      </h3>
                      
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ 
                          color: 'rgba(255, 255, 255, 0.5)', 
                          fontSize: '0.75rem', 
                          marginBottom: '4px' 
                        }}>
                          localhost test URL
                        </div>
                        <code style={{ 
                          color: '#60a5fa', 
                          fontSize: '0.85rem',
                          wordBreak: 'break-all',
                          display: 'block'
                        }}>
                          {testUrl}
                        </code>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={`/ar/${encodeURIComponent(sessionId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.buttonPrimary}
                          style={{ 
                            flex: 1,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px 16px'
                          }}
                        >
                          <span>🚀</span> open AR test page
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(testUrl);
                            alert('URL copied to clipboard!');
                          }}
                          className={styles.buttonSecondary}
                          style={{ padding: '12px 16px' }}
                        >
                          copy URL
                        </button>
                      </div>

                      <p style={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        fontSize: '0.8rem',
                        marginTop: '12px',
                        marginBottom: 0,
                        lineHeight: '1.4'
                      }}>
                        💡 point your camera at the marker image you uploaded to see the 3D WMCYN logo
                      </p>
                    </div>
                  );
                })()}

                {/* action buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleCloseSuccess}
                    className={styles.buttonPrimary}
                    style={{ flex: 1, padding: '12px 24px' }}
                  >
                    view product details
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccess(false);
                      setCreatedData(null);
                      router.push('/admin');
                    }}
                    className={styles.buttonSecondary}
                    style={{ padding: '12px 24px' }}
                  >
                    dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
