/* eslint-disable @typescript-eslint/no-namespace */
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { db, ref, push, set } from '../utils/lib/firebase';
import Typewriter from 'typewriter-effect';
import NextImage from '../components/NextImage';
import styles from '@/styles/Index.module.scss';
import { useAuth } from '../contexts/AuthContext';
import LiquidGlassEffect from '../components/ui/LiquidGlassEffect';
import React from 'react';
import { useRouter } from 'next/router';

const WMCYNLOGO = '/wmcyn_logo_white.png';
const InstagramLogo = '/instagram-logo.png';
const WMCYNQRCODE = '/wmcyn-qr.png';

const InfiniteMirror = dynamic(() => import('../components/effects/InfiniteMirror'), { ssr: false });

// --- dynamically import arcamera ---
const ARCamera = dynamic(
  () => import('../components/ARCamera'),
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
};

function NewsletterModal({ open, onClose, onSubmit, email, setEmail, error, hasSubscribed }: NewsletterModalProps) {
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
      backdropFilter: 'blur(4px)'
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
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 2, right: 8, background: 'none', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer', padding: 2, borderRadius: 8, zIndex: 2 }}>×</button>
        <h2 style={{ fontFamily: 'Inter, sans-serif', color: 'white', fontWeight: 500, fontSize: '1.5rem', margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
          sign up for updates
        </h2>
        <p style={{ color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 15, textAlign: 'center', margin: 0, opacity: 0.85, maxWidth: 320 }}>
          join our newsletter to get early access, news, and exclusive offers. no spam, ever.
        </p>
        <form onSubmit={onSubmit} style={{ background: 'none', boxShadow: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'row', gap: 8, width: '100%', maxWidth: 320, alignItems: 'center', justifyContent: 'center' }}>
          <LiquidGlassEffect variant="button">
            <input
              type="email"
              placeholder="enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', width: 140, minWidth: 0 }}
            />
          </LiquidGlassEffect>
          <LiquidGlassEffect variant="button">
            <button type="submit" style={{ background: 'none', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', width: 90, minWidth: 0, cursor: 'pointer' }}>
              subscribe
            </button>
          </LiquidGlassEffect>
        </form>
        {error && <p style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center', margin: 8 }}>{error}</p>}
        {hasSubscribed && <p style={{ color: '#51cf66', fontSize: 16, textAlign: 'center', margin: 8 }}>subscribed.</p>}
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
  const [modalOpen, setModalOpen] = useState(true);
  const [isCtaLoading, setIsCtaLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('email is required.');
      return;
    }
    
    writeUserData(email)
      .then(() => {
        setHasSubscribed(true);
        setEmail('');
        setError('');
      })
      .catch((err) => {
        try {
          const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
          existingEmails.push({ email, timestamp: Date.now(), fallback: true });
          localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
          
          setHasSubscribed(true);
          setEmail('');
          setError('');
        } catch (localErr) {
          setError('Unable to submit. Please try again later.');
        }
      });
  };

  return (
    <div className={styles.container} id="homeSection">
      {/* <InfiniteMirror depth={6} /> */}
      <div className={`${styles.contentPanel} ${styles.heroPanel}`}>
        <NextImage src={WMCYNLOGO} alt="WMCYN Logo" className={styles.logo} priority />
        <div className={styles.ctaContainer}>
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
        </div>
        <div className={styles.textContainer}>
          friends & family and custom orders only up until week 1 of the f/w collection.
        </div>
        <div className={styles.ctaContainer}>
          <LiquidGlassEffect variant="button">
            <button
              className={styles.ctaButton}
              onClick={() => {
                setIsCtaLoading(true);
                setTimeout(() => {
                  if (currentUser) {
                    router.push('/shop/friends-and-family');
                  } else {
                    router.push('/login');
                  }
                }, 1500);
              }}
              disabled={isCtaLoading}
            >
              {isCtaLoading ? 'loading...' : 'friends and family shop'}
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
        <div className={styles.instagramContainer}>
          <span className={styles.instagramText}>follow us @whatmorecouldyouneed</span>
          <a href="https://instagram.com/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer">
            <NextImage src={InstagramLogo} alt="Instagram Logo" className={styles.instagramLogo} />
          </a>
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
    <>
      <div className={styles.pageContainer}>
        <InfiniteMirror />
        <NewsletterSection />
        <AboutSection />
        <ScannerSection onCameraOpen={() => setShowCamera(true)} />
      </div>
    </>
  );
}