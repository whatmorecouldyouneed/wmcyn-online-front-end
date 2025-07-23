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
    document.body.classList.add(styles.cameraActive);

    return () => document.body.classList.remove(styles.cameraActive);
  }, [showCamera]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);

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
        // Try localStorage fallback
        try {
          const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
          existingEmails.push({ email, timestamp: Date.now(), fallback: true });
          localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
          
          // Show success since we saved it locally
          setHasSubscribed(true);
          setEmail('');
          setError('');
        } catch (localErr) {
          setError('Unable to submit. Please try again later.');
        }
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
              <a href="https://instagram.com/whatmorecouldyouneed" target="_blank" rel="noopener noreferrer">
                <NextImage src={InstagramLogo} alt="Instagram Logo" className={styles.instagramLogo} />
              </a>
              <span className={styles.instagramText}>follow us @whatmorecouldyouneed</span>
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
              <div className={styles.userDashboard}>
                <div className={styles.welcomeMessage}>welcome back</div>
                <div className={styles.userEmail}>{currentUser.email}</div>
                
                <div className={styles.collectionContainer}>
                  <h3 className={styles.collectionTitle}>your collection</h3>
                  {products.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
                      no products in collection yet
                    </p>
                  ) : (
                    <ul className={styles.productList}>
                      {products.map(product => (
                        <li key={product.id} className={styles.productItem}>
                          <span className={styles.productName}>
                            {product.name || product.id}
                          </span>
                          <button 
                            onClick={() => setTransferProductId(product.id)} 
                            className={`${styles.submitButton} ${styles.transferButton}`}
                          >
                            transfer
                          </button>
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
                    }} className={styles.authForm} style={{ marginTop: '20px' }}>
                      <input
                        type="email"
                        value={transferEmail}
                        onChange={e => setTransferEmail(e.target.value)}
                        placeholder="recipient email"
                        className={styles.inputField}
                        required
                      />
                      <button 
                        type="submit" 
                        className={`${styles.submitButton} ${styles.primaryButton}`}
                      >
                        send transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferProductId(null);
                          setTransferEmail('');
                          setTransferError('');
                        }}
                        className={`${styles.submitButton} ${styles.secondaryButton}`}
                      >
                        cancel
                      </button>
                      {transferError && <div className={styles.error}>{transferError}</div>}
                    </form>
                  )}
                </div>
                
                <button 
                  onClick={() => logout()} 
                  className={`${styles.submitButton} ${styles.secondaryButton}`}
                >
                  sign out
                </button>
              </div>
            ) : (
              <div className={styles.authContainer}>
                <div className={styles.authModeSelector}>
                  <button 
                    onClick={() => setAuthMode('login')} 
                    className={`${styles.submitButton} ${authMode === 'login' ? styles.primaryButton : styles.secondaryButton}`}
                  >
                    login
                  </button>
                  <button 
                    onClick={() => setAuthMode('signup')} 
                    className={`${styles.submitButton} ${authMode === 'signup' ? styles.primaryButton : styles.secondaryButton}`}
                  >
                    sign up
                  </button>
                </div>

                <button 
                  onClick={async () => { 
                    try { 
                      await googleSignIn(); 
                    } catch (err: any) { 
                      setAuthError(err.message); 
                    } 
                  }} 
                  className={`${styles.submitButton} ${styles.googleButton}`}
                >
                  continue with google
                </button>

                {authMode === 'login' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError('');
                    try {
                      await login(authEmail, authPassword);
                    } catch (err: any) {
                      setAuthError(err.message || 'Login failed');
                    }
                  }} className={styles.authForm}>
                    <input 
                      type="email" 
                      value={authEmail} 
                      onChange={e => setAuthEmail(e.target.value)} 
                      placeholder="email" 
                      className={styles.inputField} 
                      required 
                    />
                    <input 
                      type="password" 
                      value={authPassword} 
                      onChange={e => setAuthPassword(e.target.value)} 
                      placeholder="password" 
                      className={styles.inputField} 
                      required 
                    />
                    <button 
                      type="submit" 
                      className={`${styles.submitButton} ${styles.primaryButton}`}
                    >
                      sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className={`${styles.submitButton} ${styles.secondaryButton}`}
                    >
                      forgot password?
                    </button>
                    {authError && <div className={styles.error}>{authError}</div>}
                  </form>
                )}

                {authMode === 'signup' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError('');
                    if (authPassword !== confirmPassword) {
                      setAuthError('passwords do not match');
                      return;
                    }
                    try {
                      await signup(authEmail, authPassword);
                    } catch (err: any) {
                      setAuthError(err.message || 'Signup failed');
                    }
                  }} className={styles.authForm}>
                    <input 
                      type="email" 
                      value={authEmail} 
                      onChange={e => setAuthEmail(e.target.value)} 
                      placeholder="email" 
                      className={styles.inputField} 
                      required 
                    />
                    <input 
                      type="password" 
                      value={authPassword} 
                      onChange={e => setAuthPassword(e.target.value)} 
                      placeholder="password" 
                      className={styles.inputField} 
                      required 
                    />
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      placeholder="confirm password" 
                      className={styles.inputField} 
                      required 
                    />
                    <button 
                      type="submit" 
                      className={`${styles.submitButton} ${styles.primaryButton}`}
                    >
                      create account
                    </button>
                    {authError && <div className={styles.error}>{authError}</div>}
                  </form>
                )}

                {authMode === 'forgot' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError('');
                    try {
                      await resetPassword(authEmail);
                      setAuthError('Password reset email sent! Check your inbox.');
                    } catch (err: any) {
                      setAuthError(err.message || 'Password reset failed');
                    }
                  }} className={styles.authForm}>
                    <input 
                      type="email" 
                      value={authEmail} 
                      onChange={e => setAuthEmail(e.target.value)} 
                      placeholder="email" 
                      className={styles.inputField} 
                      required 
                    />
                    <button 
                      type="submit" 
                      className={`${styles.submitButton} ${styles.primaryButton}`}
                    >
                      send reset email
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode(null)}
                      className={`${styles.submitButton} ${styles.secondaryButton}`}
                    >
                      back
                    </button>
                    {authError && (
                      <div className={authError.includes('sent') ? styles.success : styles.error}>
                        {authError}
                      </div>
                    )}
                  </form>
                )}

                {!authMode && authError && <div className={styles.error}>{authError}</div>}
              </div>
            )}
          </div>

          {/* AR Scanner -> NFT Marker */}
          <div id="scannerSection" className={`${styles.container} ${styles.aboutSection}`}>
            <h2 className={styles.sectionHeading}>SCAN WMCYN ID</h2>
            <div className={styles.scannerSection}>
              <div className={styles.scannerContainer}>
                <div 
                  onClick={() => { setError(''); setShowCamera(true); }} 
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
                color: 'rgba(255, 255, 255, 0.7)', 
                marginTop: '16px',
                fontSize: '1rem'
              }}>
                tap to open camera scanner
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}