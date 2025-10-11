import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useInventory } from '@/hooks/useInventory';
import NextImage from '@/components/NextImage';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import styles from '@/styles/Index.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { data: profile, loading: loadingProfile, error: profileError } = useProfile();
  const { items: inventory, loading: loadingInventory, error: inventoryError } = useInventory(true);
  const router = useRouter();
  const [transferEmail, setTransferEmail] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail || !transferProductId) return;
    
    try {
      setTransferLoading(true);
      setTransferError('');
      // TODO: implement transfer via API endpoint
      // await transferProduct(transferProductId, transferEmail);
      setShowTransferModal(false);
      setTransferEmail('');
      setTransferProductId('');
    } catch (error: any) {
      setTransferError(error.message || 'transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  const openTransferModal = (productId: string) => {
    setTransferProductId(productId);
    setShowTransferModal(true);
    setTransferError('');
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
          {/* header with logo and logout */}
          <div style={{ 
            display: 'flex', 
            justifyContent: isMobile ? 'center' : 'space-between', 
            alignItems: 'center', 
            marginBottom: !mounted ? '2rem' : (isMobile ? '1.5rem' : '2rem'),
            flexWrap: 'wrap',
            gap: !mounted ? '1rem' : (isMobile ? '0.75rem' : '1rem'),
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
            
            <div style={{ 
              display: 'flex', 
              gap: !mounted ? '1rem' : (isMobile ? '0.75rem' : '1rem'), 
              alignItems: 'center',
              marginTop: isMobile ? '1rem' : '0'
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
                  <LiquidGlassEffect key={item.entitlementId} variant="button">
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
                        {item.product?.title ?? item.productId}
                      </h3>
                      
                      {item.acquiredAt && (
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginBottom: '1rem'
                        }}>
                          acquired: {new Date(item.acquiredAt).toLocaleDateString()}
                        </p>
                      )}
                      
                      <LiquidGlassEffect variant="button">
                        <button
                          onClick={() => openTransferModal(item.entitlementId)}
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
                          transfer
                        </button>
                      </LiquidGlassEffect>
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
            gap: !mounted ? '1.5rem' : (isMobile ? '1rem' : '1.5rem'),
            flexWrap: 'wrap',
            padding: !mounted ? '0' : (isMobile ? '0 1rem' : '0'),
            marginTop: !mounted ? '2rem' : (isMobile ? '1.5rem' : '2rem'),
            marginBottom: !mounted ? '1rem' : (isMobile ? '2rem' : '1rem'),
            width: '100%',
            maxWidth: !mounted ? '500px' : (isMobile ? '400px' : '500px')
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
        </div>
      </div>

      {/* transfer modal */}
      {showTransferModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(20, 20, 30, 0.85)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          animation: 'modalFadeIn 0.4s ease-out forwards'
        }}>
          <div style={{
            background: 'rgba(30, 35, 50, 0.85)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
            padding: '28px 24px 24px 24px',
            margin: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            minWidth: 320,
            maxWidth: 400,
            backdropFilter: 'blur(12px)',
            position: 'relative',
            animation: 'modalSlideIn 0.5s ease-out forwards',
            transform: 'translateY(-20px)',
            opacity: 0
          }}>
            <button 
              onClick={() => setShowTransferModal(false)} 
              style={{ 
                position: 'absolute', 
                top: 8, 
                right: 12, 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: 24, 
                cursor: 'pointer', 
                padding: 4, 
                borderRadius: 8, 
                zIndex: 2 
              }}
            >
              ×
            </button>
            
            <h2 style={{ 
              fontFamily: 'var(--font-outfit), sans-serif', 
              color: 'white', 
              fontWeight: 500, 
              fontSize: '1.5rem', 
              margin: 0, 
              textAlign: 'center', 
              letterSpacing: '-0.02em' 
            }}>
              transfer item
            </h2>
            
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.85)', 
              fontFamily: 'var(--font-outfit), sans-serif', 
              fontSize: 15, 
              textAlign: 'center', 
              margin: 0, 
              maxWidth: 300, 
              lineHeight: 1.4 
            }}>
              enter the email address of the wmcyn user you want to transfer this item to.
            </p>

            <form onSubmit={handleTransfer} style={{ 
              width: '100%', 
              maxWidth: 300, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px' 
            }}>
              <LiquidGlassEffect variant="button">
                <input
                  type="email"
                  placeholder="recipient email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  required
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'white', 
                    fontSize: 14, 
                    padding: '0.8rem 1rem', 
                    borderRadius: '0.8rem', 
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-outfit), sans-serif'
                  }}
                />
              </LiquidGlassEffect>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <LiquidGlassEffect variant="button">
                  <button 
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: 14, 
                      padding: '0.8rem 1.2rem', 
                      borderRadius: '0.8rem', 
                      flex: 1,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-outfit), sans-serif'
                    }}
                  >
                    cancel
                  </button>
                </LiquidGlassEffect>
                
                <LiquidGlassEffect variant="button">
                  <button 
                    type="submit"
                    disabled={transferLoading || !transferEmail}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: (transferLoading || !transferEmail) ? 'rgba(255, 255, 255, 0.5)' : 'white', 
                      fontSize: 14, 
                      padding: '0.8rem 1.2rem', 
                      borderRadius: '0.8rem', 
                      flex: 1,
                      cursor: (transferLoading || !transferEmail) ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-outfit), sans-serif'
                    }}
                  >
                    {transferLoading ? 'transferring...' : 'transfer'}
                  </button>
                </LiquidGlassEffect>
              </div>
              
              {transferError && (
                <p style={{ 
                  color: '#ff6b6b', 
                  fontSize: 14, 
                  textAlign: 'center', 
                  margin: 0,
                  fontFamily: 'var(--font-outfit), sans-serif',
                  lineHeight: 1.4
                }}>
                  {transferError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 