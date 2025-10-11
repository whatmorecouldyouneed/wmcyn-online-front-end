/* eslint-disable @typescript-eslint/no-namespace */
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { db, ref, push, set } from '@/utils/lib/firebase';
import { query, get, orderByChild, equalTo } from 'firebase/database';
import Typewriter from 'typewriter-effect';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Index.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import LiquidGlassEffect from '@/components/ui/LiquidGlassEffect';
import React from 'react';
import { useRouter } from 'next/router';

const WMCYNLOGO = '/wmcyn_logo_white.png';
const InstagramLogo = '/instagram-logo.png';
const YouTubeLogo = '/youtube-logo.png';
const TikTokLogo = '/tiktok-logo.png';
const TwitchLogo = '/twitch-logo.png';
const WMCYNQRCODE = '/wmcyn-qr.png';

const InfiniteMirror = dynamic(() => import('@/components/effects/InfiniteMirror'), { ssr: false });

// --- dynamically import arcamera ---
const ARCamera = dynamic(
  () => import('@/components/ARCamera'),
  {
    ssr: false, // critical: prevents server-side rendering attempts
    loading: () => <div className={styles.arjsLoader}>Initializing AR Scanner...</div>
  }
);

function writeUserData(emailID: string) {
  if (!db) {
    console.error('Firebase database not initialized');
    return Promise.reject(new Error('Firebase not initialized'));
  }
  
  const emailListRef = ref(db, 'emailList');
  const newEmailRef = push(emailListRef);
  const emailData = { 
    email: emailID,
    timestamp: Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  };
  
  return set(newEmailRef, emailData).catch((error) => {
    console.error('Firebase write failed:', error);
    throw error;
  });
}

type NewsletterModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  email: string;
  setEmail: (email: string) => void;
  error: string;
  hasSubscribed: boolean;
  isChecking?: boolean;
  onEmailChange?: (email: string) => void;
};

function NewsletterModal({ open, onClose, onSubmit, email, setEmail, error, hasSubscribed, isChecking, onEmailChange }: NewsletterModalProps) {
  if (!open) return null;
  return (
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
        padding: '20px 24px 24px 24px',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        minWidth: 320,
        maxWidth: 360,
        backdropFilter: 'blur(12px)',
        position: 'relative',
        animation: 'modalSlideIn 0.5s ease-out forwards',
        transform: 'translateY(-20px)',
        opacity: 0
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 2, right: 8, background: 'none', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer', padding: 2, borderRadius: 8, zIndex: 2 }}>×</button>
        <h2 style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'white', fontWeight: 500, fontSize: '1.5rem', margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
          sign up for updates
        </h2>
        <p style={{ color: 'white', fontFamily: 'var(--font-outfit), sans-serif', fontSize: 15, textAlign: 'center', margin: 0, opacity: 0.85, maxWidth: 320 }}>
          join our newsletter to get early access, news, and exclusive offers. no spam, ever.
        </p>
        <form onSubmit={onSubmit} style={{ background: 'none', boxShadow: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'row', gap: 8, width: '100%', maxWidth: 320, alignItems: 'center', justifyContent: 'center' }}>
          <LiquidGlassEffect variant="button">
            <input
              type="email"
              placeholder="enter your email"
              value={email}
              onChange={(e) => {
                if (onEmailChange) {
                  onEmailChange(e.target.value);
                } else {
                  setEmail(e.target.value);
                }
              }}
              required
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', width: 140, minWidth: 0 }}
            />
          </LiquidGlassEffect>
          <LiquidGlassEffect variant="button">
            <button 
              type="submit" 
              disabled={isChecking || error.includes('already subscribed')} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: (isChecking || error.includes('already subscribed')) ? 'rgba(255,255,255,0.5)' : 'white', 
                fontSize: 14, 
                padding: '0.4rem 0.8rem', 
                borderRadius: '0.8rem', 
                width: 90, 
                minWidth: 0, 
                cursor: (isChecking || error.includes('already subscribed')) ? 'not-allowed' : 'pointer' 
              }}
            >
              {isChecking ? 'checking...' : 'subscribe'}
            </button>
          </LiquidGlassEffect>
        </form>
        {error && <p style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center', margin: 8 }}>{error}</p>}
        {hasSubscribed && <p style={{ color: '#51cf66', fontSize: 16, textAlign: 'center', margin: 8 }}>subscribed.</p>}
      </div>
    </div>
  );
}

function LoginPromptModal({ open, onClose, onLogin, onSignup }: { 
  open: boolean; 
  onClose: () => void; 
  onLogin: () => void; 
  onSignup: () => void; 
}) {
  if (!open) return null;
  return (
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
        padding: '24px',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        minWidth: 320,
        maxWidth: 380,
        backdropFilter: 'blur(12px)',
        position: 'relative',
        animation: 'modalSlideIn 0.5s ease-out forwards',
        transform: 'translateY(-20px)',
        opacity: 0
      }}>
        <button 
          onClick={onClose} 
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
          login required
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
          you need to be logged in to access the friends & family shop. please log in or create an account to continue.
        </p>
                 <div style={{ 
           display: 'flex', 
           gap: 12, 
           width: '100%', 
           maxWidth: 300 
         }}>
           <LiquidGlassEffect variant="button">
             <button 
               onClick={onSignup}
               style={{ 
                 background: 'none', 
                 border: 'none', 
                 color: 'white', 
                 fontSize: 14, 
                 padding: '0.6rem 1.2rem', 
                 borderRadius: '0.8rem', 
                 flex: 1,
                 cursor: 'pointer',
                 fontFamily: 'var(--font-outfit), sans-serif'
               }}
             >
               sign up
             </button>
           </LiquidGlassEffect>
           <LiquidGlassEffect variant="button">
             <button 
               onClick={onLogin}
               style={{ 
                 background: 'none', 
                 border: 'none', 
                 color: 'white', 
                 fontSize: 14, 
                 padding: '0.6rem 1.2rem', 
                 borderRadius: '0.8rem', 
                 flex: 1,
                 cursor: 'pointer',
                 fontFamily: 'var(--font-outfit), sans-serif'
               }}
             >
               login
             </button>
           </LiquidGlassEffect>
         </div>
      </div>
    </div>
  );
}

// newsletter section component
function NewsletterSection() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isCtaLoading, setIsCtaLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    // show modal after 8 seconds regardless of localStorage
    // the actual duplicate check happens in handleSubmit
    const timer = setTimeout(() => {
      setModalOpen(true);
    }, 8000);
    return () => {
      clearTimeout(timer);
      // cleanup debounced email check on unmount
      if (debouncedEmailCheck.current) {
        clearTimeout(debouncedEmailCheck.current);
      }
    };
  }, []);

  // debounced email checking to avoid too many API calls
  const debouncedEmailCheck = useRef<NodeJS.Timeout | null>(null);
  
  const checkEmailSubscription = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@') || !db) {
      setError('');
      return;
    }
    
    try {
      setIsChecking(true);
      const emailListRef = ref(db, 'emailList');
      const emailQuery = query(emailListRef, orderByChild('email'), equalTo(emailToCheck));
      const snapshot = await get(emailQuery);
      
      if (snapshot.exists()) {
        setError('you\'re already subscribed!');
      } else {
        setError('');
      }
    } catch (err) {
      // silently fail for email checking, don't show error
      console.log('Email check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    
    // clear previous timeout
    if (debouncedEmailCheck.current) {
      clearTimeout(debouncedEmailCheck.current);
    }
    
    // clear error immediately if email is changed
    if (error.includes('already subscribed')) {
      setError('');
    }
    
    // debounce the email check by 800ms
    debouncedEmailCheck.current = setTimeout(() => {
      checkEmailSubscription(newEmail);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('email is required.');
      return;
    }
    
    try {
      if (!db) {
        setError('database not available. please try again later.');
        return;
      }
      
      // double-check for duplicates before submitting
      const emailListRef = ref(db, 'emailList');
      const emailQuery = query(emailListRef, orderByChild('email'), equalTo(email));
      const snapshot = await get(emailQuery);

      if (snapshot.exists()) {
        setError('this email is already subscribed.');
        return;
      }

      await writeUserData(email);
      setHasSubscribed(true);
      setEmail('');
      setError('');
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);
    } catch (err) {
      // fallback to localStorage only if firebase fails completely
      try {
        const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
        if (existingEmails.some((item: { email: string }) => item.email === email)) {
          setError('this email is already subscribed.');
          return;
        }
        
        existingEmails.push({ email, timestamp: Date.now(), fallback: true });
        localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
        
        setHasSubscribed(true);
        setEmail('');
        setError('');
        setTimeout(() => {
          setModalOpen(false);
        }, 1500);
      } catch (localErr) {
        setError('unable to submit. please try again later.');
      }
    }
  };

  return (
    <div className={styles.container} id="homeSection">
      {/* <InfiniteMirror depth={6} /> */}
      <div className={`${styles.contentPanel} ${styles.heroPanel}`}>
        <NextImage src={WMCYNLOGO} alt="WMCYN Logo" className={styles.logo} priority />
        <div className={styles.ctaContainer}>
          {currentUser ? (
            // show dashboard and logout for logged-in users
            <>
              <LiquidGlassEffect 
                variant="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push('/dashboard');
                }}
              >
                <button className={styles.ctaButton}>
                  dashboard
                </button>
              </LiquidGlassEffect>
              <LiquidGlassEffect 
                variant="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push('/dashboard');
                }}
              >
                <button className={styles.ctaButton}>
                  profile
                </button>
              </LiquidGlassEffect>
            </>
          ) : (
            // show signup and login for non-logged-in users
            <>
              <LiquidGlassEffect 
                variant="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Signup button clicked');
                  router.push('/login?mode=signup');
                }}
              >
                <button className={styles.ctaButton}>
                  sign up
                </button>
              </LiquidGlassEffect>
              <LiquidGlassEffect 
                variant="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Login button clicked');
                  router.push('/login');
                }}
              >
                <button className={styles.ctaButton}>
                  login
                </button>
              </LiquidGlassEffect>
            </>
          )}
        </div>
        <div className={styles.textContainer}>
          friends & family and custom orders only up until week 1 of the f/w collection
        </div>
        <div className={styles.ctaContainer}>
          <LiquidGlassEffect variant="button">
            <button
              className={styles.ctaButton}
              onClick={() => {
                if (currentUser) {
                  setIsCtaLoading(true);
                  setTimeout(() => {
                    router.push('/shop/friends-and-family');
                  }, 1500);
                } else {
                  setShowLoginPrompt(true);
                }
              }}
              disabled={isCtaLoading}
            >
              {isCtaLoading ? 'loading...' : 'shop'}
            </button>
          </LiquidGlassEffect>
          <LiquidGlassEffect variant="button">
            <button className={styles.ctaButton}>
              custom order
            </button>
          </LiquidGlassEffect>
        </div>
      </div>
      <NewsletterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        email={email}
        setEmail={setEmail}
        error={error}
        hasSubscribed={hasSubscribed}
        isChecking={isChecking}
        onEmailChange={handleEmailChange}
      />
      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={() => {
          setShowLoginPrompt(false);
          router.push('/login');
        }}
        onSignup={() => {
          setShowLoginPrompt(false);
          router.push('/login?mode=signup');
        }}
      />
    </div>
  );
}

// about section component
function AboutSection() {
  return (
    <div className={`${styles.container} ${styles.aboutSection}`} id="aboutSection">
      <div className={styles.contentPanel}>
        <h2 className={styles.sectionHeading}>ABOUT WMCYN</h2>
        <p className={styles.sectionText}>
          what more could you need is a future-forward xr collective built on the advancement of modern technology
          intertwined with the basics of everyday lifestyle
        </p>
        <div className={styles.socialMediaContainer}>
          <span className={styles.socialMediaText}>follow us @whatmorecouldyouneed</span>
          <div className={styles.socialMediaIcons}>
            <a href="https://instagram.com/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer">
              <NextImage src={InstagramLogo} alt="Instagram" className={styles.socialMediaLogo} />
            </a>
            <a href="https://youtube.com/@whatmorecouldyouneed" target="_blank" rel="noopener noreferrer">
              <NextImage src={YouTubeLogo} alt="YouTube" className={styles.socialMediaLogo} />
            </a>
            <a href="https://tiktok.com/@whatmorecouldyouneed" target="_blank" rel="noopener noreferrer">
              <NextImage src={TikTokLogo} alt="TikTok" className={styles.socialMediaLogo} />
            </a>
            <a href="https://twitch.tv/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer">
              <NextImage src={TwitchLogo} alt="Twitch" className={styles.socialMediaLogo} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// scanner section component
function ScannerSection({ onCameraOpen }: { onCameraOpen: () => void }) {
  return (
    <div id="scannerSection" className={`${styles.container} ${styles.aboutSection}`}>
      <div className={styles.contentPanel}>
        <h2 className={styles.sectionHeading}>SCAN WMCYN ID</h2>
        <div 
          onClick={onCameraOpen}
          className={styles.cameraButton}
        >
          <NextImage 
            src={WMCYNQRCODE} 
            alt="SCAN WMCYN ID" 
            width={200} 
            height={200}
            className={styles.scannerImage}
          />
        </div>
        <p className={styles.scannerText}>
          tap to open camera scanner
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const { currentUser } = useAuth();

  if (showCamera) {
    return <ARCamera onClose={() => setShowCamera(false)} />;
  }

  return (
    <div className={styles.pageContainer}>
      
      {/* main content with droste effect starts here */}
      <div style={{ 
        position: 'relative', 
        zIndex: 1
      }}>
        <InfiniteMirror />
        <NewsletterSection />
        <AboutSection />
        <ScannerSection onCameraOpen={() => setShowCamera(true)} />
      </div>
    </div>
  );
}