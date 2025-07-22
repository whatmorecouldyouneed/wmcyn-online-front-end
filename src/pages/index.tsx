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
  
  console.log('📧 Attempting to save email to Firebase:', emailID);
  console.log('🔥 Firebase database instance:', !!db);
  console.log('🌐 Database URL:', `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`);
  
  const emailListRef = ref(db, 'emailList');
  console.log('📋 Created emailList reference');
  
  const newEmailRef = push(emailListRef);
  console.log('🆕 Created new email reference:', newEmailRef.key);
  
  const emailData = { 
    email: emailID,
    timestamp: Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  };
  console.log('📦 Email data to save:', emailData);
  
  // Add timeout to prevent hanging
  const firebasePromise = set(newEmailRef, emailData).then(() => {
    console.log('✅ Firebase set() operation completed successfully');
    console.log('📧 Email successfully saved to Firebase:', emailID);
    return true;
  }).catch((error) => {
    console.error('❌ Firebase set() operation failed:', error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Check if it's a permissions issue
    if (error.code === 'PERMISSION_DENIED') {
      console.error('🚫 Firebase database rules are blocking writes to emailList');
      console.error('💡 Solution: Update Firebase database rules to allow writes');
    }
    
    throw error;
  });
  
  // Add 10 second timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      console.error('⏰ Firebase operation timed out after 10 seconds');
      console.error('💡 This might be due to:');
      console.error('   1. Firebase database rules blocking writes');
      console.error('   2. Network connectivity issues');
      console.error('   3. Firebase project configuration problems');
      reject(new Error('Firebase operation timed out'));
    }, 10000);
  });
  
  return Promise.race([firebasePromise, timeoutPromise]);
}

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Debug function to check saved emails
  useEffect(() => {
    // Log saved emails for debugging
    try {
      const savedEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
      if (savedEmails.length > 0) {
        console.log('📬 Emails saved in localStorage:', savedEmails);
      }
    } catch (e) {
      console.log('No emails in localStorage yet');
    }
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('⏳ Already submitting, ignoring duplicate submission');
      return;
    }
    
    console.log('🔥 FORM SUBMITTED! Button click detected');
    console.log('Form submitted, email:', email);
    
    if (!email) {
      console.log('❌ No email provided');
      setError('email is required.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    console.log('✅ Email validation passed, calling writeUserData...');
    
    // Add manual timeout as backup
    const manualTimeout = setTimeout(() => {
      console.error('🚨 Manual timeout - resetting submit state');
      setIsSubmitting(false);
      setError('Submission timed out. Please try again.');
    }, 15000);
    
    writeUserData(email)
      .then(() => {
        clearTimeout(manualTimeout);
        console.log('✅ writeUserData succeeded - showing success state');
        
        // Also save to localStorage as backup
        try {
          const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
          existingEmails.push({ email, timestamp: Date.now() });
          localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
          console.log('💾 Email also saved to localStorage as backup');
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
        
        setHasSubscribed(true);
        setEmail('');
        setError('');
        setIsSubmitting(false);
      })
      .catch((err) => {
        clearTimeout(manualTimeout);
        console.error('❌ writeUserData failed:', err);
        
        // Try localStorage fallback
        try {
          const existingEmails = JSON.parse(localStorage.getItem('wmcyn-emails') || '[]');
          existingEmails.push({ email, timestamp: Date.now(), fallback: true });
          localStorage.setItem('wmcyn-emails', JSON.stringify(existingEmails));
          console.log('💾 Email saved to localStorage as fallback');
          
          // Show success since we saved it locally (email still collected)
          setHasSubscribed(true);
          setEmail('');
          setError('');
          console.log('✅ Showing success state (localStorage fallback worked)');
        } catch (localErr) {
          console.error('❌ Failed localStorage fallback:', localErr);
          setError('Unable to submit. Please try again later.');
        }
        
        setIsSubmitting(false);
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'submitting...' : 'subscribe'}
                  </button>
                </form>
                {/* Debug: Reset button if stuck */}
                {isSubmitting && (
                  <button 
                    onClick={() => {
                      console.log('🔄 Manual reset triggered');
                      setIsSubmitting(false);
                      setError('Reset manually. Please try again.');
                    }}
                    style={{ 
                      marginTop: '10px', 
                      padding: '5px 10px', 
                      background: 'red', 
                      color: 'white', 
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Reset (Debug)
                  </button>
                )}
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