import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { arSessions as arSessionsAPI } from '@/lib/apiClient';
import { CreateARSessionRequest, UpdateARSessionRequest } from '@/types/arSessions';
import ARSessionForm from '@/components/admin/ARSessionForm';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function CreateARSession() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (data: CreateARSessionRequest | UpdateARSessionRequest) => {
    try {
      setLoading(true);
      // ensure we have all required fields for creation
      if (!data.name || !data.metadata) {
        throw new Error('Missing required fields for AR session creation');
      }
      const session = await arSessionsAPI.create(data as CreateARSessionRequest);
      router.push(`/admin/ar-sessions/${session.sessionId}`);
    } catch (error: any) {
      console.error('failed to create ar session:', error);
      throw error; // let the form handle the error display
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/ar-sessions');
  };

  if (authLoading) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.loadingContainer}>
            loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // will redirect
  }

  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.adminContainer}>
        {/* header */}
        <div className={styles.adminHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NextImage
              src={WMCYNLOGO}
              alt="WMCYN Logo"
              width={80}
              height={40}
              priority
            />
            <h1 className={styles.adminTitle}>create ar session</h1>
          </div>
          <button 
            onClick={handleCancel}
            className={styles.buttonSecondary}
          >
            back to ar sessions
          </button>
        </div>

        {/* form */}
        <ARSessionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </div>
  );
}
