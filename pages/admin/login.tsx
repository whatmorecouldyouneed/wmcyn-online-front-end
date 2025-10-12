import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Index.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function AdminLogin() {
  const { login, isAuthenticated, loading } = useAdminAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('please enter both username and password');
      return;
    }

    setLoginLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (success) {
        router.push('/admin');
      } else {
        setError('invalid username or password');
      }
    } catch (err) {
      setError('login failed, please try again');
    } finally {
      setLoginLoading(false);
    }
  };

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
            access the product sets management interface
          </p>

          {/* login form */}
          <form onSubmit={handleSubmit} className={styles.authForm}>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

            {error && (
              <div style={{ 
                color: '#ff6b6b', 
                fontSize: '0.9rem', 
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loginLoading || !username || !password}
            >
              {loginLoading ? 'signing in...' : 'sign in'}
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
