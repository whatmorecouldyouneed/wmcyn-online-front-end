/* eslint-disable @typescript-eslint/no-namespace */
import { useState, useEffect } from 'react';
import router from 'next/router';
import dynamic from 'next/dynamic';
import { db, ref, push, set } from '../utils/lib/firebase';
import Typewriter from 'typewriter-effect';
import NextImage from '../components/NextImage';

import WMCYNLOGO from '../../public/wmcyn_logo_white.png';
import InstagramLogo from '../../public/instagram-logo.png';
import WMCYNQRCODE from '../../public/wmcyn-qr.png';
import styles from '@/styles/Index.module.scss';
import { useAuth } from '../contexts/AuthContext';
import { useUserProducts } from '../hooks/useUserProducts';

// --- dynamically import arcamera ---
const ARCamera = dynamic(
  () => import('../components/ARCamera').catch(err => {
    console.error('Failed to load AR Camera component:', err);
    return { default: () => <div>AR Camera failed to load</div> };
  }),
  {
    ssr: false, // critical: prevents server-side rendering attempts
    loading: () => <div className={styles.arjsLoader}>Initializing AR Scanner...</div>
  }
);

function writeUserData(emailID: string) {
  if (!db) {
    console.error('Firebase database not initialized - email submission failed');
    console.error('Firebase config check:', {
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    return Promise.reject(new Error('Firebase not initialized'));
  }
  
  console.log('Attempting to save email to Firebase:', emailID);
  const emailListRef = ref(db, 'emailList');
  const newEmailRef = push(emailListRef);
  
  return set(newEmailRef, { 
    email: emailID,
    timestamp: Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  }).then(() => {
    console.log('Email successfully saved to Firebase:', emailID);
  }).catch((error) => {
    console.error('Firebase set() operation failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  });
}

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [transferProductId, setTransferProductId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferError, setTransferError] = useState('');

  useEffect(() => {
    if (showCamera) document.body.classList.add(styles.cameraActive);
    else document.body.classList.remove(styles.cameraActive);

    return () => document.body.classList.remove(styles.cameraActive);
  }, [showCamera]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔥 FORM SUBMITTED! Button click detected');
    console.log('Form submitted, email:', email);
    console.log('Event:', e);
    
    if (!email) {
      console.log('❌ No email provided');
      setError('email is required.');
      return;
    }
    
    console.log('✅ Email validation passed, calling writeUserData...');
    writeUserData(email)
      .then(() => {
        console.log('✅ writeUserData succeeded');
        setHasSubscribed(true);
        setEmail('');
        setError('');
      })
      .catch((err) => {
        console.error('❌ writeUserData failed:', err);
        setError(err.message || 'Failed to subscribe.');
        console.error('Email submission error:', err);
      });
  };

  const handleShopAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'test') {
      localStorage.setItem('hasAccessToShop', 'true');
      router.push('/shop');
    } else {
      setError('Incorrect password');
    }
  };
  const { currentUser, login, signup, googleSignIn, resetPassword, logout } = useAuth();
  const { products, transferProduct } = useUserProducts();

  return (
    <div>
      {showCamera ? (
        <ARCamera onClose={() => setShowCamera(false)} />
      ) : (
        <div className={styles.pageContainer}>
          {/* HOME / Newsletter Section */}
          <div className={styles.container} id="homeSection">
            <NextImage src={WMCYNLOGO} alt="WMCYN Logo" className={styles.logo} priority />
            {hasSubscribed ? (
              <>
                <h1 className={styles.typewriter}>
                  <Typewriter options={{ strings: ['WMCYN WELCOMES YOU'], autoStart: true, loop: true }} />
                </h1>
                <p>subscribed.</p>
              </>
            ) : (
              <>
                <h1 className={styles.typewriter}>
                  <Typewriter
                    options={{
                      strings: ["YOU'RE EARLY...", 'SIGN UP FOR OUR NEWSLETTER'],
                      autoStart: true,
                      loop: true,
                    }}
                  />
                </h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <input
                    type="email"
                    placeholder="enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    className={styles.inputField}
                    required
                  />
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    onClick={() => console.log('🖱️ BUTTON CLICKED! Click event detected')}
                  >
                    subscribe
                  </button>
                </form>
                {/* Only show error related to this form */}
                {error && !password && <p className={styles.error}>{error}</p>}
              </>
            )}
          </div>

          {/* ABOUT Section */}
          <div className={`${styles.container} ${styles.aboutSection}`} id="aboutSection">
            <h2 className={styles.sectionHeading}>ABOUT WMCYN</h2>
            <p className={styles.sectionText}>
              future-forward start-up built on the advancement of modern technology
              intertwined with the basics of everyday lifestyle.
            </p>
            <div className={styles.instagramContainer}>
              <a href="https://instagram.com/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer" className={styles.instagramLink}>
                <NextImage src={InstagramLogo} alt="Instagram Logo" className={styles.instagramLogo} />
              </a>
            </div>
          </div>

          {/* FRIENDS & FAMILY SHOP Section */}
          <div id="friendsAndFamilySection" className={`${styles.container} ${styles.friendsAndFamilySection}`}>
            <h2 className={styles.sectionHeading}>FRIENDS AND FAMILY SHOP</h2>
            <form onSubmit={handleShopAccess} className={styles.form}>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={handlePasswordChange}
                className={styles.inputField}
              />
              <button type="submit" className={styles.submitButton}>
                enter store
              </button>
            </form>
             {/* only show error related to this form */}
            {error && password && <p className={styles.error}>{error}</p>}
          </div>
          {/* Account Section */}
          <div id="accountSection" className={`${styles.container} ${styles.accountSection}`}>
            <h2 className={styles.sectionHeading}>ACCOUNT</h2>
            {currentUser ? (
              <div>
                <p>welcome, {currentUser.email}</p>
                <button onClick={logout} className={styles.submitButton}>log out</button>
                <h3>your collection</h3>
                {products.length === 0 ? (
                  <p>no products in collection.</p>
                ) : (
                  <ul>
                    {products.map(product => (
                      <li key={product.id}>
                        {product.name || product.id}
                        <button onClick={() => setTransferProductId(product.id)} className={styles.submitButton}>transfer</button>
                      </li>
                    ))}
                  </ul>
                )}
                {transferProductId && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await transferProduct(transferProductId, transferEmail);
                      setTransferProductId(null);
                      setTransferEmail('');
                      setTransferError('');
                    } catch (err: any) {
                      setTransferError(err.message || 'An error occurred during transfer');
                    }
                  }} className={styles.form}>
                    <input
                      type="email"
                      value={transferEmail}
                      onChange={e => setTransferEmail(e.target.value)}
                      placeholder="recipient email"
                      className={styles.inputField}
                      required
                    />
                    <button type="submit" className={styles.submitButton}>transfer</button>
                    {transferError && <p className={styles.error}>{transferError}</p>}
                  </form>
                )}
              </div>
            ) : (
              <div>
                <div className={styles.form}>
                  <button onClick={() => setAuthMode('login')} className={styles.submitButton}>login</button>
                  <button onClick={() => setAuthMode('signup')} className={styles.submitButton}>sign up</button>
                  <button onClick={() => setAuthMode('forgot')} className={styles.submitButton}>forgot password</button>
                  <button onClick={async () => { try { await googleSignIn(); } catch (err: any) { setAuthError(err.message); } }} className={styles.submitButton}>sign in with google</button>
                </div>
                {authMode === 'login' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await login(authEmail, authPassword);
                    } catch (err: any) {
                      setAuthError(err.message || 'An error occurred');
                    }
                  }} className={styles.form}>
                    <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email" className={styles.inputField} required />
                    <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="password" className={styles.inputField} required />
                    <button type="submit" className={styles.submitButton}>login</button>
                  </form>
                )}
                {authMode === 'signup' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (authPassword !== confirmPassword) {
                      setAuthError('passwords do not match');
                      return;
                    }
                    try {
                      await signup(authEmail, authPassword);
                    } catch (err: any) {
                      setAuthError(err.message || 'An error occurred');
                    }
                  }} className={styles.form}>
                    <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email" className={styles.inputField} required />
                    <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="password" className={styles.inputField} required />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="confirm password" className={styles.inputField} required />
                    <button type="submit" className={styles.submitButton}>sign up</button>
                  </form>
                )}
                {authMode === 'forgot' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await resetPassword(authEmail);
                      setAuthError('password reset email sent');
                    } catch (err: any) {
                      setAuthError(err.message || 'An error occurred');
                    }
                  }} className={styles.form}>
                    <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email" className={styles.inputField} required />
                    <button type="submit" className={styles.submitButton}>reset password</button>
                  </form>
                )}
                {authError && <p className={styles.error}>{authError}</p>}
              </div>
            )}
          </div>

          {/* AR Scanner -> NFT Marker */}
          <div id="qrCodeSection" className={`${styles.container} ${styles.qrCodeSection}`}>
            <h2 className={styles.sectionHeading}>SCAN WMCYN ID</h2>
            <div onClick={() => { setError(''); setShowCamera(true); }} className={styles.cameraButton}>
              <NextImage src={WMCYNQRCODE} alt="SCAN WMCYN ID" className={styles.qrCodeImage} width={150} height={150} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}