import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ARCamera from '@/components/ARCamera';
import { ARSessionData } from '@/types/arSessions';
import { arSessions } from '@/lib/apiClient';
import { arsessionToMarkerConfig, validateBackendARSession } from '@/utils/markerSync';
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
        <h2>error loading ar session</h2>
        <p>{error}</p>
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

  // transform session data to marker config format using utility function
  // validates mindar compatibility per public/patterns/README.md
  const validation = validateBackendARSession(sessionData);
  if (!validation.isValid) {
    console.error('[ARSessionPage] backend validation errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('[ARSessionPage] backend validation warnings:', validation.warnings);
  }
  
  const markerConfig = arsessionToMarkerConfig(sessionData);

  return (
    <ARCamera 
      configs={[markerConfig]}
      onClose={handleClose}
    />
  );
}

async function loadARSession(sessionId: string): Promise<ARSessionData> {
  try {
    // use apiClient which handles the correct endpoint: GET /api/ar-sessions/:id/data
    return await arSessions.get(sessionId);
  } catch (error: any) {
    console.error('[ARSessionPage] failed to load ar session:', error);
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      throw new Error('ar session not found');
    }
    throw new Error(`failed to load ar session: ${error?.message || 'unknown error'}`);
  }
}
