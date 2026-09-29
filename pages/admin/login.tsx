import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Index.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function AdminLogin() {
  const { login, resetPassword, isAuthenticated, loading, error: authError } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('please enter both email and password');
      return;
    }

    setLoginLoading(true);
    setError('');
    setNotice('');

    try {
      await login(email, password);
      router.push('/admin');
    } catch (err: any) {
      setError(err?.message || 'login failed, please try again');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('enter your email first, then choose forgot password');
      return;
    }
    setError('');
    try {
      await resetPassword(email);
      setNotice('if that email has an account, a password reset link is on its way');
    } catch (err: any) {
      setError(err?.message || 'could not send reset email');
    }
  };

  const shownError = error || authError;

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div style={{ color: 'white', fontSize: '1.2rem' }}>loading...</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // will redirect
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.authContainer}>
          {/* logo */}
          <div style={{ marginBottom: '32px' }}>
            <NextImage
              src={WMCYNLOGO}
              alt="WMCYN Logo"
              width={120}
              height={60}
              priority
            />
          </div>

          {/* title */}
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '300', 
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            admin login
          </h1>
          
          <p style={{ 
            fontSize: '1rem', 
            opacity: 0.8, 
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            founders sign in with their own wmcyn account
          </p>

          {/* login form */}
          <form onSubmit={handleSubmit} className={styles.authForm}>
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.inputField}
              disabled={loginLoading}
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputField}
              disabled={loginLoading}
              autoComplete="current-password"
            />

            {shownError && (
              <div style={{ 
                color: '#ff6b6b', 
                fontSize: '0.9rem', 
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {shownError}
              </div>
            )}

            {notice && (
              <div style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {notice}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loginLoading || !email || !password}
            >
              {loginLoading ? 'signing in...' : 'sign in'}
            </button>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loginLoading}
              style={{
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              forgot password
            </button>
          </form>

          {/* back to main site */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link 
              href="/" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              ← back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
