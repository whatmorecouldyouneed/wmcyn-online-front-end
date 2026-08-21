import { useState, FormEvent } from 'react';
import Head from 'next/head';
import { db, ref, push, set } from '@/utils/lib/firebase';
import { CONSENT_VERSION } from '@/lib/privacy/consent-types';
import LegalContact from '@/components/legal/LegalContact';
import { siteConfig } from '@/config/site';
import styles from '@/styles/Legal.module.scss';

const REQUEST_TYPES = [
  { value: 'access', label: 'access my data' },
  { value: 'correct', label: 'correct my data' },
  { value: 'delete', label: 'delete my data' },
  { value: 'marketing-optout', label: 'marketing opt-out' },
  { value: 'other', label: 'other privacy request' },
] as const;

export default function PrivacyChoicesPage() {
  const [requestType, setRequestType] = useState<string>(REQUEST_TYPES[0].value);
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [error, setError] = useState('');

  const canonical = `${siteConfig.url}/privacy-choices`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('please enter a valid email address.');
      return;
    }
    if (!db) {
      setError('this form is temporarily unavailable. please email us directly instead.');
      return;
    }

    setStatus('submitting');
    try {
      const requestsRef = ref(db, 'privacyRequests');
      const newRequestRef = push(requestsRef);
      await set(newRequestRef, {
        requestType,
        email,
        description: description || null,
        timestamp: Date.now(),
        consentVersion: CONSENT_VERSION,
        source: 'privacy-choices-page',
      });
      setStatus('submitted');
      setEmail('');
      setDescription('');
    } catch {
      setStatus('error');
      setError('something went wrong submitting your request. please try again or email us directly.');
    }
  };

  return (
    <>
      <Head>
        <title>privacy choices | WMCYN</title>
        <meta name="description" content="Submit a data access, correction, deletion, or opt-out request to WMCYN." />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={canonical} />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>privacy choices</h1>
          </header>

          <div className={styles.intro}>
            <p>
              Use this page to ask WMCYN to access, correct, or delete your personal information, or to opt out
              of marketing communications. This includes account deletion requests.
            </p>
            <p>
              We only ask for what we need to find and act on your request. We’ll use the email address you
              provide to verify and respond to you — we don’t automatically expose account details just because
              a request comes in; sensitive requests may require a separate verification step before we act.
            </p>
          </div>

          {status === 'submitted' ? (
            <p className={styles.formSuccess} role="status">
              Request received. We’ll follow up at the email address you provided.
            </p>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="request-type">request type</label>
                <select id="request-type" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="request-email">email address</label>
                <input
                  id="request-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="request-description">optional description</label>
                <textarea
                  id="request-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="anything that helps us understand your request"
                />
              </div>

              {error && <p className={styles.formError}>{error}</p>}

              <button type="submit" className={styles.submitButton} disabled={status === 'submitting'}>
                {status === 'submitting' ? 'submitting…' : 'submit request'}
              </button>
            </form>
          )}

          <LegalContact />
        </div>
      </div>
    </>
  );
}
