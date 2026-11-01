import { FormEvent, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/utils/lib/firebase';
import { PASSWORD_MIN_LENGTH, passwordResetLinkError } from '@/utils/password-reset';
import styles from '@/styles/Index.module.scss';

type LinkStatus = 'checking' | 'ready' | 'invalid';

function queryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function ResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState<LinkStatus>('checking');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const oobCode = queryValue(router.query.oobCode);
  const mode = queryValue(router.query.mode);

  useEffect(() => {
    if (!router.isReady) return;

    // password reset is handled here. other firebase email actions stay on
    // the hosted handler so verify-email links keep working.
    if (mode && mode !== 'resetPassword') {
      const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      if (authDomain) {
        const params = new URLSearchParams(window.location.search);
        window.location.replace(`https://${authDomain}/__/auth/action?${params.toString()}`);
      }
      return;
    }

    if (!oobCode) {
      setStatus('invalid');
      setError('open the reset link from your email, or request a new one.');
      return;
    }

    if (!auth) {
      setStatus('invalid');
      setError('password reset is not available right now.');
      return;
    }

    let cancelled = false;
    setStatus('checking');
    setError('');
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        if (cancelled) return;
        setAccountEmail(email);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('invalid');
        setError(passwordResetLinkError(err));
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, oobCode, mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('passwords do not match');
      return;
    }
    if (!auth || !oobCode) {
      setError('this reset link does not work. request a new one.');
      return;
    }

    setSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      await router.replace(`/login?reset=1`);
    } catch (err: any) {
      setError(passwordResetLinkError(err));
      if (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code') {
        setStatus('invalid');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title key="title">reset password — WMCYN</title>
      </Head>
      <div className={styles.authContainer}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          new password
        </h1>

        {status === 'checking' && (
          <p style={{ color: 'rgba(255, 255, 255, 0.75)', textAlign: 'center' }}>
            checking reset link...
          </p>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className={styles.authForm}>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', textAlign: 'center', margin: 0 }}>
              choose a new password for {accountEmail}. use at least {PASSWORD_MIN_LENGTH} characters.
            </p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="new password"
              className={styles.inputField}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="confirm password"
              className={styles.inputField}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <button
              type="submit"
              disabled={saving}
              className={`${styles.submitButton} ${styles.primaryButton}`}
            >
              {saving ? 'saving...' : 'save new password'}
            </button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}

        {status === 'invalid' && (
          <div className={styles.authForm}>
            <div className={styles.error}>{error}</div>
            <Link
              href="/login?mode=forgot"
              className={`${styles.submitButton} ${styles.primaryButton}`}
              style={{ textDecoration: 'none' }}
            >
              request a new email
            </Link>
          </div>
        )}

        <Link href="/login" style={{ color: 'white', fontSize: '14px' }}>
          back to login
        </Link>
      </div>
    </div>
  );
}
