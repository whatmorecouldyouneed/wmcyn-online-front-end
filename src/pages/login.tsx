import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import styles from '../styles/Index.module.scss';
import LiquidGlassEffect from '../components/ui/LiquidGlassEffect';

export default function Login() {
  const router = useRouter();
  const { mode } = router.query;
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { currentUser, login, signup, googleSignIn, resetPassword } = useAuth();

  useEffect(() => {
    if (currentUser) {
      // ensure we redirect to dashboard without trailing slash
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    // check for Google sign-in errors from redirect
    if (typeof window !== 'undefined') {
      const googleError = sessionStorage.getItem('googleSignInError');
      if (googleError) {
        setAuthError(googleError);
        sessionStorage.removeItem('googleSignInError');
      }
    }
  }, []);

  useEffect(() => {
    if (mode === 'signup') {
      setAuthMode('signup');
    }
  }, [mode]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
        router.replace('/dashboard');
      } else if (authMode === 'signup') {
        if (authPassword !== confirmPassword) {
          setAuthError('passwords do not match');
          return;
        }
        await signup(authEmail, authPassword);
        router.replace('/dashboard');
      } else if (authMode === 'forgot') {
        await resetPassword(authEmail);
        setAuthError('password reset email sent! check your inbox.');
        return;
      }
    } catch (err: any) {
      setAuthError(err.message || 'authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError('');
    try {
      // googleSignIn tries popup first, falls back to redirect if blocked
      await googleSignIn();
    } catch (err: any) {
      setAuthError(err.message || 'google sign in failed');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authContainer}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '1rem', 
          textAlign: 'center',
          marginTop: isMobile ? '-1rem' : '0'
        }}>
          {authMode === 'login' ? 'friends & family' : 
           authMode === 'signup' ? 'sign up' : 
           'reset password'}
        </h1>
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <input 
            type="email" 
            value={authEmail} 
            onChange={e => setAuthEmail(e.target.value)} 
            placeholder="email" 
            className={styles.inputField} 
            required 
          />
          
          {authMode !== 'forgot' && (
            <input 
              type="password" 
              value={authPassword} 
              onChange={e => setAuthPassword(e.target.value)} 
              placeholder="password" 
              className={styles.inputField} 
              required 
            />
          )}

          {authMode === 'signup' && (
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="confirm password" 
              className={styles.inputField} 
              required 
            />
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`${styles.submitButton} ${styles.primaryButton}`}
          >
            {loading ? 'processing...' : 
             authMode === 'login' ? 'login' : 
             authMode === 'signup' ? 'join' : 
             'send reset signal'}
          </button>

          {authMode === 'login' && (
            <button
              type="button"
              onClick={() => setAuthMode('forgot')}
              className={`${styles.submitButton} ${styles.secondaryButton}`}
            >
              forgot password?
            </button>
          )}

          {authMode !== 'login' && (
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`${styles.submitButton} ${styles.secondaryButton}`}
            >
              back to login
            </button>
          )}

          {authError && (
            <div className={authError.includes('sent') ? styles.success : styles.error}>
              {authError}
            </div>
          )}
        </form>

        <div style={{ margin: '1rem 0', textAlign: 'center' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>or</span>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`${styles.submitButton} ${styles.googleButton}`}
        >
          {loading ? 'connecting...' : 'continue with google'}
        </button>

        {authMode === 'login' && (
          <p style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
            don&apos;t have an account?{' '}
            <button 
              onClick={() => setAuthMode('signup')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                textDecoration: 'underline', 
                cursor: 'pointer', 
                fontSize: '14px',
                margin: 0,
                padding: 0,
                fontFamily: 'inherit'
              }}
            >
              sign up
            </button>
          </p>
        )}

        {authMode === 'signup' && (
          <p style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
            already have an account?{' '}
            <button 
              onClick={() => setAuthMode('login')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                textDecoration: 'underline', 
                cursor: 'pointer', 
                fontSize: '14px',
                margin: 0,
                padding: 0,
                fontFamily: 'inherit'
              }}
            >
              login
            </button>
          </p>
        )}

        <div style={{ marginTop: isMobile ? '1rem' : '1.5rem' }}>
          <LiquidGlassEffect>
            <Link href="/" style={{ 
              textDecoration: 'none', 
              color: 'white', 
              fontSize: isMobile ? '14px' : '16px'
            }}>
              return to portal
            </Link>
          </LiquidGlassEffect>
        </div>
      </div>
    </div>
  );
} 