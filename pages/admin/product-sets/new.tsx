import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { createProductSet } from '@/lib/apiClient';
import { CreateProductSetRequest } from '@/types/productSets';
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
    mindFileUrl?: string | null;
    arTitle: string;
    arDescription: string;
    arActions: Array<{ type: string; label: string; url?: string }>;
  }) => {
    try {
      setLoading(true);
      
      // create product set with marker pattern and mind file url
      console.log('[CreateProductSet] Creating Product Set...');
      console.log('[CreateProductSet] Mind file URL:', data.mindFileUrl);
      
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
        // include the nft marker info if we have a mind file url
        ...(data.mindFileUrl && {
          nftMarker: {
            mindFileUrl: data.mindFileUrl,
            compiledAt: new Date().toISOString()
          }
        }),
        // include ar overlay metadata
        arMetadata: {
          title: data.arTitle || data.name,
          description: data.arDescription || data.description,
          actions: data.arActions || []
        }
      };
      
      console.log('[CreateProductSet] Product Set data:', productSetData);
      
      const productSet = await createProductSet(productSetData);
      console.log('[CreateProductSet] Product set created:', productSet);
      
      // show success modal with test link
      setCreatedData({
        productSetId: productSet.id,
        arSessionId: null,
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
