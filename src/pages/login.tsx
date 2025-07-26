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
  
  const { currentUser, login, signup, googleSignIn, resetPassword } = useAuth();

  useEffect(() => {
    if (currentUser) {
      router.push('/shop/friends-and-family');
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (mode === 'signup') {
      setAuthMode('signup');
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
      } else if (authMode === 'signup') {
        if (authPassword !== confirmPassword) {
          setAuthError('passwords do not match');
          return;
        }
        await signup(authEmail, authPassword);
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
      await googleSignIn();
    } catch (err: any) {
      setAuthError(err.message || 'google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authContainer}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          {authMode === 'login' ? 'friends and family' : 
           authMode === 'signup' ? 'signup' : 
           'reset password'}
        </h1>

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
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`${styles.submitButton} ${styles.googleButton}`}
        >
          {loading ? 'connecting...' : 'continue with google'}
        </button>

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

        <LiquidGlassEffect>
          <Link href="/" className={styles.ctaButton} style={{ marginTop: '2rem', textAlign: 'center', display: 'block' }}>
            return to portal
          </Link>
        </LiquidGlassEffect>
      </div>
    </div>
  );
} 