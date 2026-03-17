// static export stub
export function getStaticPaths() { return { paths: [], fallback: false }; }
export function getStaticProps() { return { props: {} }; }

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ARCamera from '@/components/ARCamera';
import { ARSessionData } from '@/types/arSessions';
import { arSessions } from '@/lib/apiClient';
import { MarkerConfig } from '@/config/markers';
import styles from '@/styles/Index.module.scss';

export default function ARSessionPage() {
  const router = useRouter();
  const sessionId = router.query.id as string;
  const [sessionData, setSessionData] = useState<ARSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    
    loadARSession(sessionId)
      .then(setSessionData)
      .catch(err => {
        console.error('failed to load ar session:', err);
        setError(err.message || 'failed to load ar session');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleClose = () => {
    // go back to previous page or home
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          loading ar session...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>ar session not found</h2>
        <p>
          the ar session you&apos;re looking for could not be found. this might be because:
        </p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li>the session was deleted or expired</li>
          <li>the qr code is invalid or corrupted</li>
          <li>the session was never created properly</li>
        </ul>
        <p>
          please check your qr code and try again, or contact support if the problem persists.
        </p>
        <button onClick={handleClose} className={styles.button}>
          go back
        </button>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className={styles.errorContainer}>
        <h2>ar session not found</h2>
        <p>the requested ar session could not be found.</p>
        <button onClick={handleClose} className={styles.button}>
          go back
        </button>
      </div>
    );
  }

  // transform session data to marker config format
  const markerConfig: MarkerConfig = {
    name: sessionData.markerPattern.name || sessionData.sessionId || 'ar-session',
    patternUrl: sessionData.markerPattern.url,
    modelUrl: sessionData.asset3D?.url || '/models/wmcyn_3d_logo.glb',
    scale: 0.3,
    metadata: {
      ...sessionData.metadata,
      actions: sessionData.metadata.actions?.map(action => ({
        ...action,
        type: action.type as 'purchase' | 'share' | 'claim' | 'info'
      })) || []
    },
    onFound: () => {
      console.log('ar session marker found:', sessionData.sessionId);
    }
  };

  return (
    <ARCamera 
      configs={[markerConfig]}
      onClose={handleClose}
    />
  );
}

async function loadARSession(sessionId: string): Promise<ARSessionData> {
  try {
    return await arSessions.get(sessionId);
  } catch (error: any) {
    console.error('error loading ar session:', error);
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('ar session not found');
    }
    throw error;
  }
}
