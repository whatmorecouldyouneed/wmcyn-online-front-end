 import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useCollection } from '@/hooks/useCollection';
import type { CollectionItem } from '@/lib/apiClient';
import NextImage from '@/components/NextImage';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import styles from '@/styles/Index.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { data: profile, loading: loadingProfile, error: profileError } = useProfile();
  const { items: inventory, loading: loadingInventory, error: inventoryError } = useCollection();
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      router.push('/');
    } catch (error) {
      console.error('logout failed:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const describe = (item: CollectionItem) => {
    if (item.kind === 'instance') {
      return item.editionNumber && item.editionSize ? `${item.editionNumber} of ${item.editionSize}` : 'claimed item';
    }
    if (item.kind === 'purchase') return 'purchased';
    return 'redeemed';
  };

  if (!currentUser) {
    return null; // will redirect to login
  }

  return (
    <div 
      className={styles.pageContainer} 
      style={{ 
        scrollSnapType: 'none',
        height: 'auto',
        minHeight: '100vh',
        overflowY: 'auto'
      }}
    >
      <div 
        className={styles.container} 
        style={{ 
          height: 'auto',
          minHeight: '100vh',
          justifyContent: 'flex-start',
          paddingTop: !mounted ? '2rem' : (isMobile ? '1rem' : '2rem'),
          paddingBottom: !mounted ? '2rem' : (isMobile ? '2rem' : '2rem'),
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div 
          className={styles.contentPanel}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* header with logo */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            marginBottom: !mounted ? '2rem' : (isMobile ? '1.5rem' : '2rem'),
            width: '100%',
            padding: '0 1rem'
          }}>
            <NextImage 
              src={WMCYNLOGO} 
              alt="WMCYN Logo" 
              className={styles.logo}
              style={{ 
                maxWidth: isMobile ? '200px' : '250px',
                height: 'auto'
              }}
            />
          </div>

          {/* user info */}
          <div style={{ 
            marginBottom: !mounted ? '2rem' : (isMobile ? '1.5rem' : '2rem'), 
            textAlign: 'center',
            width: '100%'
          }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 300, 
              letterSpacing: '2px', 
              marginBottom: '0.5rem',
              color: 'white',
              textAlign: 'center'
            }}>
              wmcyn dashboard
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
              textAlign: 'center'
            }}>
              welcome back, {profile?.username ?? currentUser.email}
            </p>
            {profileError && (
              <p style={{ 
                fontSize: '12px', 
                color: '#ff6b6b',
                margin: '0.5rem 0 0 0',
                textAlign: 'center'
              }}>
                profile error: {profileError}
              </p>
            )}
          </div>

          {/* products grid */}
          <div style={{ 
            marginBottom: !mounted ? '2rem' : (isMobile ? '1.5rem' : '2rem'),
            width: '100%'
          }}>
            <h2 style={{ 
              fontSize: '1.2rem', 
              fontWeight: 400, 
              marginBottom: '1.5rem',
              color: 'white',
              textAlign: 'center'
            }}>
              your wmcyn collection ({inventory?.length ?? 0})
            </h2>
            
            {loadingInventory ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '16px'
              }}>
                loading inventory...
              </div>
            ) : inventoryError ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem',
                color: '#ff6b6b',
                fontSize: '16px'
              }}>
                inventory error: {inventoryError}
              </div>
            ) : (inventory?.length ?? 0) === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '16px'
              }}>
                no items in your collection yet.
                <br />
                <span style={{ fontSize: '14px' }}>
                  scan wmcyn ids or purchase items to build your collection.
                </span>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: !mounted ? 'repeat(auto-fit, minmax(280px, 1fr))' : (isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'), 
                gap: !mounted ? '1.5rem' : (isMobile ? '1rem' : '1.5rem'),
                maxWidth: '900px',
                margin: '0 auto',
                padding: !mounted ? '0' : (isMobile ? '0 1rem' : '0'),
                width: '100%',
                justifyItems: 'center'
              }}>
                {(inventory ?? []).map((item) => (
                  <LiquidGlassEffect key={`${item.kind}:${item.id}`} variant="button">
                    <div style={{ 
                      padding: !mounted ? '1.5rem' : (isMobile ? '1rem' : '1.5rem'),
                      textAlign: 'center',
                      width: '100%',
                      maxWidth: '280px'
                    }}>
                      <h3 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 500, 
                        marginBottom: '0.5rem',
                        color: 'white'
                      }}>
                        {item.title ?? 'wmcyn item'}
                      </h3>

                      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>
                        {describe(item)}
                      </p>
                      
                      {item.acquiredAt && (
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginBottom: '1rem'
                        }}>
                          acquired: {new Date(item.acquiredAt).toLocaleDateString()}
                        </p>
                      )}

                      {item.kind === 'instance' && item.publicId && (
                        <LiquidGlassEffect variant="button">
                          <button
                            onClick={() => router.push(`/p/${item.publicId}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '13px',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '0.6rem',
                              cursor: 'pointer',
                              fontFamily: 'inherit'
                            }}
                          >
                            view item
                          </button>
                        </LiquidGlassEffect>
                      )}
                    </div>
                  </LiquidGlassEffect>
                ))}
              </div>
            )}
          </div>

          {/* navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: !mounted ? '1rem' : (isMobile ? '0.75rem' : '1rem'),
            flexWrap: 'wrap',
            padding: !mounted ? '0' : (isMobile ? '0 1rem' : '0'),
            marginTop: !mounted ? '2rem' : (isMobile ? '1.5rem' : '2rem'),
            marginBottom: !mounted ? '1rem' : (isMobile ? '2rem' : '1rem'),
            width: '100%',
            maxWidth: !mounted ? '600px' : (isMobile ? '400px' : '600px')
          }}>
            <LiquidGlassEffect variant="button">
              <button 
                onClick={() => router.push('/shop/friends-and-family')}
                className={styles.ctaButton}
                style={{ 
                  fontSize: !mounted ? '16px' : (isMobile ? '14px' : '16px'),
                  padding: !mounted ? '0.75rem 1.5rem' : (isMobile ? '0.6rem 1.2rem' : '0.75rem 1.5rem'),
                  minWidth: !mounted ? '140px' : (isMobile ? '120px' : '140px')
                }}
              >
                shop
              </button>
            </LiquidGlassEffect>
            
            <LiquidGlassEffect variant="button">
              <button 
                onClick={() => router.push('/#scannerSection')}
                className={styles.ctaButton}
                style={{ 
                  fontSize: !mounted ? '16px' : (isMobile ? '14px' : '16px'),
                  padding: !mounted ? '0.75rem 1.5rem' : (isMobile ? '0.6rem 1.2rem' : '0.75rem 1.5rem'),
                  minWidth: !mounted ? '140px' : (isMobile ? '120px' : '140px')
                }}
              >
                scan wmcyn id
              </button>
            </LiquidGlassEffect>
            
          </div>

          {/* secondary navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: !mounted ? '1rem' : (isMobile ? '0.75rem' : '1rem'),
            flexWrap: 'wrap',
            padding: !mounted ? '0' : (isMobile ? '0 1rem' : '0'),
            marginTop: !mounted ? '1rem' : (isMobile ? '0.75rem' : '1rem'),
            marginBottom: !mounted ? '2rem' : (isMobile ? '2rem' : '2rem'),
            width: '100%',
            maxWidth: !mounted ? '400px' : (isMobile ? '350px' : '400px')
          }}>
            <LiquidGlassEffect variant="button">
              <button 
                onClick={() => router.push('/')}
                className={styles.ctaButton}
                style={{ 
                  fontSize: !mounted ? '14px' : (isMobile ? '12px' : '14px'), 
                  padding: !mounted ? '0.5rem 1rem' : (isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem'),
                  minWidth: !mounted ? '80px' : (isMobile ? '70px' : '80px')
                }}
              >
                portal
              </button>
            </LiquidGlassEffect>
            
            <LiquidGlassEffect variant="button">
              <button 
                onClick={handleLogout}
                className={styles.ctaButton}
                disabled={logoutLoading}
                style={{ 
                  fontSize: !mounted ? '14px' : (isMobile ? '12px' : '14px'), 
                  padding: !mounted ? '0.5rem 1rem' : (isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem'),
                  minWidth: !mounted ? '80px' : (isMobile ? '70px' : '80px'),
                  backgroundColor: logoutLoading ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                }}
              >
                {logoutLoading ? 'logging out...' : 'logout'}
              </button>
            </LiquidGlassEffect>
          </div>
        </div>
      </div>

    </div>
  );
} 