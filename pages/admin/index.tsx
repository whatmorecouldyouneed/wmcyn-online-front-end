import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { getProductSets, getQRCodes, arSessions as arSessionsAPI } from '@/lib/apiClient';
import { ProductSet, QRCodeData } from '@/types/productSets';
import { ARSessionData } from '@/types/arSessions';
import ProductSetCard from '@/components/admin/ProductSetCard';
import QRCodeGenerator from '@/components/admin/QRCodeGenerator';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function AdminDashboard() {
  const { isAuthenticated, logout, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [productSets, setProductSets] = useState<ProductSet[]>([]);
  const [arSessions, setArSessions] = useState<ARSessionData[]>([]);
  const [qrCodeCounts, setQrCodeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [arSessionsError, setArSessionsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductSet, setSelectedProductSet] = useState<ProductSet | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // load wmcyn products and ar sessions
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadProductSets = async (): Promise<ProductSet[]> => {
    try {
      setError('');
      const response = await getProductSets();
      console.log('[AdminDashboard] Product sets raw response:', response);
      
      // handle different response structures - backend returns { items: [...] }
      let productSetsData: ProductSet[] = [];
      if (Array.isArray(response)) {
        productSetsData = response;
      } else if (response?.items) {
        // backend returns { items: [...], total, limit, offset }
        productSetsData = response.items;
      } else if (response?.productSets) {
        productSetsData = response.productSets;
      } else if (response?.products) {
        productSetsData = response.products;
      } else if (response?.data) {
        productSetsData = Array.isArray(response.data) ? response.data : [];
      }
      
      console.log('[AdminDashboard] Parsed product sets:', productSetsData.length, 'items');
      const data = Array.isArray(productSetsData) ? productSetsData : [];
      setProductSets(data);
      return data;
    } catch (err: any) {
      console.error('failed to load wmcyn products:', err);
      setError(err.message || 'failed to load wmcyn products');
      setProductSets([]);
      return [];
    }
  };

  const loadQRCodeCounts = async (productSetsData?: ProductSet[]) => {
    try {
      const products = productSetsData || productSets;
      if (products.length === 0) {
        console.log('[AdminDashboard] No product sets to load QR codes for');
        return;
      }
      
      // fetch qr codes for each product set individually (backend requires productSetId)
      const counts: Record<string, number> = {};
      
      await Promise.all(products.map(async (ps) => {
        try {
          const response = await getQRCodes(ps.id);
          console.log(`[AdminDashboard] QR codes for ${ps.id}:`, response);
          
          // handle different response structures
          let qrCodesData: QRCodeData[] = [];
          if (Array.isArray(response)) {
            qrCodesData = response;
          } else if (response?.qrCodes) {
            qrCodesData = response.qrCodes;
          } else if (response?.items) {
            qrCodesData = response.items;
          } else if (response?.data) {
            qrCodesData = Array.isArray(response.data) ? response.data : [];
          }
          
          counts[ps.id] = qrCodesData.length;
        } catch (err) {
          console.error(`[AdminDashboard] Failed to load QR codes for ${ps.id}:`, err);
          counts[ps.id] = 0;
        }
      }));
      
      console.log('[AdminDashboard] QR code counts per product set:', counts);
      setQrCodeCounts(counts);
    } catch (err: any) {
      console.error('failed to load qr codes:', err);
      // don't show error to user, just leave counts at 0
    }
  };

  const loadARSessions = async () => {
    try {
      console.log('loading ar sessions, isAuthenticated:', isAuthenticated);
      setArSessionsError(null);
      const response = await arSessionsAPI.list();
      console.log('[AdminDashboard] AR sessions response:', response);
      // handle both array response and object with arSessions property
      const sessionsData = Array.isArray(response) 
        ? response 
        : (response?.arSessions || response?.sessions || []);
      setArSessions(sessionsData);
    } catch (err: any) {
      console.error('failed to load ar sessions:', err);
      // provide more helpful error messages based on the error type
      if (err.message?.includes('invalid token')) {
        setArSessionsError('Authentication failed - the admin API token may be invalid or the backend needs to be updated');
      } else if (err.message?.includes('Access denied')) {
        setArSessionsError('Access denied - admin privileges required for AR sessions');
      } else if (err.message?.includes('Authentication required')) {
        setArSessionsError('Authentication required - check if NEXT_PUBLIC_ADMIN_API_TOKEN is configured correctly');
      } else if (err.message === 'unauthorized' || err.message?.includes('401')) {
        setArSessionsError('AR sessions API endpoint requires authentication - check backend deployment status');
      } else {
        setArSessionsError(`Failed to load AR sessions: ${err.message}`);
      }
      setArSessions([]);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    
    // load product sets first so we can use them to map ar sessions
    const [productSetsData] = await Promise.all([
      loadProductSets(),
      isAuthenticated ? loadARSessions() : Promise.resolve()
    ]);
    
    // now load qr code counts with the product sets data
    await loadQRCodeCounts(productSetsData as ProductSet[]);
    
    setLoading(false);
  };

  const handleCreateNew = () => {
    router.push('/admin/product-sets/new');
  };

  const handleCreateARSession = () => {
    router.push('/admin/ar-sessions/new');
  };

  const handleDelete = (id: string) => {
    setProductSets(prev => prev.filter(ps => ps.id !== id));
  };

  const handleGenerateQR = (productSet: ProductSet) => {
    setSelectedProductSet(productSet);
    setShowQRGenerator(true);
  };

  const handleQRSuccess = async () => {
    // refresh the wmcyn products and qr code counts
    const products = await loadProductSets();
    // pass the freshly loaded product sets to load qr code counts
    await loadQRCodeCounts(products);
  };

  const handleLogout = () => {
    logout();
  };

  // filter wmcyn products based on search term
  const filteredProductSets = (productSets || []).filter(ps => 
    ps.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ps.description && ps.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ps.campaign && ps.campaign.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || loading) {
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
            <h1 className={styles.adminTitle}>admin dashboard</h1>
          </div>
          <div className={styles.adminActions}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleCreateNew}
                className={styles.buttonPrimary}
              >
                create wmcyn product
              </button>
              <button 
                onClick={handleCreateARSession}
                className={styles.buttonSecondary}
              >
                create AR session
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className={styles.buttonSecondary}
            >
              logout
            </button>
          </div>
        </div>

        {/* search and filter */}
        <div className={styles.searchContainer}>
          <input
            type="text"
                placeholder="search AR products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <button 
            onClick={loadAllData}
            className={styles.buttonSecondary}
            style={{ padding: '12px 16px' }}
          >
            refresh
          </button>
        </div>

        {/* error state */}
        {error && (
          <div className={styles.errorContainer}>
            {error}
          </div>
        )}

        {/* navigation tabs */}
        <div className={styles.adminTabs}>
              <button
                className={`${styles.tabButton} ${styles.active}`}
                onClick={() => router.push('/admin')}
              >
                AR products
              </button>
          <button 
            className={styles.tabButton}
            onClick={() => router.push('/admin/ar-sessions')}
          >
            ar sessions
          </button>
        </div>

        {/* help text */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          background: 'rgba(255, 255, 255, 0.05)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>AR products:</strong> AR experiences with custom markers, metadata overlays, and QR codes
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>ar sessions:</strong> immersive AR experiences with custom markers and interactive overlays
          </p>
          <p style={{ margin: '0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            <em>Note: AR sessions may require NEXT_PUBLIC_ADMIN_API_TOKEN for authentication. Frontend is ready!</em>
          </p>
        </div>

        {/* wmcyn products grid */}
        {filteredProductSets.length > 0 ? (
          <div className={styles.productSetsGrid}>
            {filteredProductSets.map((productSet) => (
              <ProductSetCard
                key={productSet.id}
                productSet={productSet}
                onDelete={handleDelete}
                onGenerateQR={handleGenerateQR}
                qrCodeCount={qrCodeCounts[productSet.id] || 0}
              />
            ))}
          </div>
        ) : !loading && (
          <div className={styles.emptyState}>
                <h2 className={styles.emptyStateTitle}>
                  {searchTerm ? 'no matching AR products' : 'no AR products yet'}
                </h2>
                <p className={styles.emptyStateDescription}>
                  {searchTerm
                    ? 'try adjusting your search terms'
                    : 'create your first AR product to get started'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateNew}
                    className={styles.buttonPrimary}
                  >
                    create AR product
                  </button>
                )}
          </div>
        )}

        {/* ar sessions preview */}
        {arSessionsError && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '16px', 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: 'rgba(255, 193, 7, 0.9)'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>AR Sessions:</strong> {arSessionsError}
            </p>
            <p style={{ margin: '0', fontSize: '0.8rem', opacity: 0.8 }}>
              The AR sessions API endpoint may require admin authentication. Set NEXT_PUBLIC_ADMIN_API_TOKEN in your environment variables to access this feature.
            </p>
          </div>
        )}
        {arSessions && arSessions.length > 0 && (
          <div className={styles.arSessionsPreview}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>recent ar sessions</h3>
              <button 
                onClick={() => router.push('/admin/ar-sessions')}
                className={styles.viewAllButton}
              >
                view all
              </button>
            </div>
            <div className={styles.arSessionsGrid}>
              {(arSessions || []).slice(0, 3).map((session) => {
                const sessionId = session.sessionId || session.id || '';
                const title = session.metadata?.title || session.name || 'untitled';
                const description = session.metadata?.description || '';
                
                return (
                  <div key={sessionId} className={styles.arSessionCard}>
                    <h4 className={styles.arSessionTitle}>{title}</h4>
                    <p className={styles.arSessionDescription}>{description}</p>
                    <div className={styles.arSessionMeta}>
                      <span className={styles.arSessionStatus}>{session.status}</span>
                      <span className={styles.arSessionDate}>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* stats summary */}
        {(productSets || []).length > 0 && (
          <div style={{ 
            marginTop: '32px', 
            padding: '24px', 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px', textAlign: 'center' }}>
              summary
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '16px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>
                  {(productSets || []).length}
                </div>
                    <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      total AR products
                    </div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>
                  {(productSets || []).reduce((sum, ps) => sum + (ps.stats?.totalClaims || 0), 0)}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  total claims
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>
                  {(productSets || []).reduce((sum, ps) => sum + (ps.stats?.remainingInventory || 0), 0)}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  remaining inventory
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>
                  {Object.values(qrCodeCounts).reduce((sum, count) => sum + count, 0) || 
                   (productSets || []).reduce((sum, ps) => sum + (ps.stats?.qrCodesGenerated || 0), 0)}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  QR codes generated
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>
                  {arSessions ? arSessions.length : 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  ar sessions
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR code generator modal */}
        <QRCodeGenerator
          productSet={selectedProductSet}
          isOpen={showQRGenerator}
          onClose={() => {
            setShowQRGenerator(false);
            setSelectedProductSet(null);
          }}
          onSuccess={handleQRSuccess}
        />
      </div>
    </div>
  );
}
