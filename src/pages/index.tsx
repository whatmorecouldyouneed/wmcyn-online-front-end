/* eslint-disable @typescript-eslint/no-namespace */
import { useState, useEffect } from 'react';
import router from 'next/router';
import dynamic from 'next/dynamic';
import { db, ref, push, set } from '../utils/lib/firebase';
import Typewriter from 'typewriter-effect';
import NextImage from '../components/NextImage';

const WMCYNLOGO = '/wmcyn_logo_white.png';
const InstagramLogo = '/instagram-logo.png';
const WMCYNQRCODE = '/wmcyn-qr.png';
import styles from '@/styles/Index.module.scss';
import { useAuth } from '../contexts/AuthContext';
import { useUserProducts } from '../hooks/useUserProducts';
import InfiniteMirror from '../components/effects/InfiniteMirror';
import LiquidGlassEffect from '../components/ui/LiquidGlassEffect';
import React from 'react';

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

function Countdown() {
  const target = new Date('2025-10-03T00:00:00');
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const diff = target.getTime() - now.getTime();
  const style: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: 9,
    color: '#f8fafc',
    letterSpacing: '0.02em',
    textShadow: '0 1px 4px rgba(0,0,0,0.18)',
    textAlign: 'center',
    width: '100%',
    display: 'block',
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    margin: '0 auto',
    zIndex: 100,
    pointerEvents: 'none',
  };
  const boldStyle: React.CSSProperties = {
    ...style,
    fontWeight: 700,
    fontSize: 10,
    position: 'static',
    marginTop: 2,
  };
  if (diff < 0) return (
    <span style={style}>
      launching now
      <br />
      <span style={boldStyle}>start collecting!</span>
    </span>
  );
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const dayLabel = days === 1 ? 'day' : 'days';
  const hourLabel = hours === 1 ? 'hour' : 'hours';
  const minuteLabel = minutes === 1 ? 'minute' : 'minutes';
  return (
    <span style={style}>
      {days} {dayLabel} {hours} {hourLabel} and {minutes} {minuteLabel} until f/w season collection
      <br />
      <span style={boldStyle}>start collecting!</span>
    </span>
  );
}

// newsletter section component
function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(true);
  // simulate user signed in state (replace with real auth if available)
  const [isSignedIn, setIsSignedIn] = useState(false);

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
        setIsSignedIn(true); // simulate sign in after subscribing
      })
      .catch((err) => {
        try {
          const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
          existingEmails.push({ email, timestamp: Date.now(), fallback: true });
          localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
          
          setHasSubscribed(true);
          setEmail('');
          setError('');
          setIsSignedIn(true); // simulate sign in after subscribing
        } catch (localErr) {
          setError('Unable to submit. Please try again later.');
        }
      });
  };

  return (
    <div className={styles.container} id="homeSection">
      <NextImage src={WMCYNLOGO} alt="WMCYN Logo" className={styles.logo} priority />
      {/* login/signup cta buttons where the email form was */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 0, whiteSpace: 'nowrap', minWidth: 200 }}>
        <LiquidGlassEffect 
          variant="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Login button clicked');
            router.push('/login');
          }}
        >
          <button 
            style={{ background: 'none', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', width: 90, minWidth: 0, cursor: 'pointer', touchAction: 'manipulation', pointerEvents: 'none' }}
          >
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
          <button 
            style={{ background: 'none', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', width: 90, minWidth: 0, cursor: 'pointer', touchAction: 'manipulation', pointerEvents: 'none' }}
          >
            sign up
          </button>
        </LiquidGlassEffect>
      </div>
      <div style={{
        marginTop: 16,
        color: '#39ff14',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: 16,
        textAlign: 'center',
        opacity: 1,
        maxWidth: 360,
        marginLeft: 'auto',
        marginRight: 'auto',
        // no text shadow
        borderRadius: 10,
        padding: '10px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}>
        friends & family and custom orders only up until week 1 of the f/w collection.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12, gap: 8 }}>
        <LiquidGlassEffect variant="button">
          <button
            style={{ background: 'none', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', minWidth: 120, cursor: 'pointer' }}
            onClick={() => {
              if (!isSignedIn) setModalOpen(true);
              // else, redirect to shop or do nothing for now
            }}
          >
            friends and family shop
          </button>
        </LiquidGlassEffect>
        <LiquidGlassEffect variant="button">
          <button
            style={{ background: 'none', border: 'none', color: 'white', fontSize: 14, padding: '0.4rem 0.8rem', borderRadius: '0.8rem', minWidth: 120, cursor: 'pointer' }}
          >
            custom order
          </button>
        </LiquidGlassEffect>
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
      <h2 style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#f8fafc',
        fontSize: '2.25rem',
        lineHeight: 1.1,
        textAlign: 'center',
        marginBottom: 20,
      }}>ABOUT WMCYN</h2>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        color: '#f8fafc',
        fontSize: 18,
        textAlign: 'center',
        maxWidth: 800,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        what more could you need inc. (wmcyn) pronounced (wim-syn) is a future-forward xr collective built on the advancement of modern technology
        intertwined with the basics of everyday lifestyle.
      </p>
      <div className={styles.instagramContainer} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span className={styles.instagramText} style={{ textAlign: 'center', marginBottom: 8, fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>follow us @whatmorecouldyouneed</span>
        <a href="https://instagram.com/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'center' }}>
          <NextImage src={InstagramLogo} alt="Instagram Logo" className={styles.instagramLogo} />
        </a>
      </div>
    </div>
  );
}

// scanner section component
function ScannerSection({ onCameraOpen }: { onCameraOpen: () => void }) {
  return (
    <div id="scannerSection" className={`${styles.container} ${styles.aboutSection}`}> 
      <h2 style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#f8fafc',
        fontSize: '2.25rem',
        lineHeight: 1.1,
        textAlign: 'center',
        marginBottom: 20,
      }}>SCAN WMCYN ID</h2>
      <div className={styles.scannerSection}>
        <div className={styles.scannerContainer}>
          <div 
            onClick={onCameraOpen}
            className={styles.cameraButton}
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <NextImage 
              src={WMCYNQRCODE} 
              alt="SCAN WMCYN ID" 
              width={200} 
              height={200}
              style={{
                maxWidth: '80%',
                height: 'auto',
                filter: 'brightness(0.9)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
        </div>
        <p style={{ 
          textAlign: 'center', 
          color: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          marginTop: '16px',
          fontSize: '1rem'
        }}>
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
      <Countdown />
      <div style={{ position: 'relative' }}>
        <InfiniteMirror depth={6} />
        <div className={styles.pageContainer}>
          <NewsletterSection />
          <AboutSection />
          <ScannerSection onCameraOpen={() => setShowCamera(true)} />
        </div>
      </div>
    </>
  );
}