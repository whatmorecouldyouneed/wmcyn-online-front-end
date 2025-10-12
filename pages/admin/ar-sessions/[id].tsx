import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { arSessions as arSessionsAPI } from '@/lib/apiClient';
import { ARSessionData, UpdateARSessionRequest } from '@/types/arSessions';
import ARSessionForm from '@/components/admin/ARSessionForm';
import QRCodeGenerator from '@/components/admin/QRCodeGenerator';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

interface ARSessionEditPageProps {
  sessionId: string;
}

export default function ARSessionEditPage({ sessionId }: ARSessionEditPageProps) {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<ARSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // load session data
  useEffect(() => {
    if (!isAuthenticated || !sessionId) return;
    
    loadSessionData();
  }, [isAuthenticated, sessionId]);

  // check for QR generation query param
  useEffect(() => {
    if (router.query.generateQR === 'true') {
      setShowQRGenerator(true);
    }
  }, [router.query]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await arSessionsAPI.list();
      const session = response.arSessions.find(s => s.sessionId === sessionId);
      
      if (!session) {
        setError('ar session not found');
        return;
      }
      
      setSessionData(session);
    } catch (error: any) {
      console.error('failed to load ar session:', error);
      setError(error.message || 'failed to load ar session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateARSessionRequest) => {
    try {
      setSaving(true);
      const updatedSession = await arSessionsAPI.update(sessionId, data);
      setSessionData(updatedSession);
    } catch (error: any) {
      console.error('failed to update ar session:', error);
      throw error; // let the form handle the error display
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/ar-sessions');
  };

  const handleDelete = async () => {
    if (!sessionData) return;
    
    if (!confirm(`are you sure you want to delete "${sessionData.metadata.title}"? this action cannot be undone.`)) {
      return;
    }

    try {
      await arSessionsAPI.delete(sessionId);
      router.push('/admin/ar-sessions');
    } catch (error: any) {
      console.error('failed to delete ar session:', error);
      alert('failed to delete ar session: ' + (error.message || 'unknown error'));
    }
  };

  const handleGenerateQR = () => {
    setShowQRGenerator(true);
  };

  const handleQRSuccess = () => {
    setShowQRGenerator(false);
    // could refresh data or show success message
  };

  const handleViewARSession = () => {
    window.open(`/ar-session/${sessionId}`, '_blank');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.loadingContainer}>
            {authLoading ? 'loading...' : 'loading ar session...'}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // will redirect
  }

  if (error) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.errorContainer}>
            <h2>error</h2>
            <p>{error}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={loadSessionData} className={styles.button}>
                try again
              </button>
              <button onClick={handleCancel} className={styles.buttonSecondary}>
                back to ar sessions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className={styles.adminPageContainer}>
        <div className={styles.adminContainer}>
          <div className={styles.errorContainer}>
            <h2>ar session not found</h2>
            <p>the requested ar session could not be found.</p>
            <button onClick={handleCancel} className={styles.button}>
              back to ar sessions
            </button>
          </div>
        </div>
      </div>
    );
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
            <h1 className={styles.adminTitle}>edit ar session</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleCancel}
              className={styles.buttonSecondary}
            >
              back to ar sessions
            </button>
            <button 
              onClick={handleViewARSession}
              className={styles.buttonSecondary}
            >
              view ar session
            </button>
            <button 
              onClick={handleGenerateQR}
              className={styles.buttonPrimary}
            >
              generate qr code
            </button>
            <button 
              onClick={handleDelete}
              className={`${styles.buttonSecondary} ${styles.dangerButton}`}
            >
              delete
            </button>
          </div>
        </div>

        {/* session info */}
        <div className={styles.sessionInfo}>
          <div className={styles.sessionMeta}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>session id:</span>
              <span className={styles.metaValue}>{sessionData.sessionId}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>status:</span>
              <span className={`${styles.statusBadge} ${styles[sessionData.status]}`}>
                {sessionData.status}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>created:</span>
              <span className={styles.metaValue}>
                {new Date(sessionData.createdAt).toLocaleString()}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>updated:</span>
              <span className={styles.metaValue}>
                {new Date(sessionData.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* form */}
        <ARSessionForm
          initialData={{
            name: sessionData.metadata.title, // using title as name for now
            description: sessionData.campaign,
            campaign: sessionData.campaign,
            productId: sessionData.product?.id,
            markerPattern: {
              patternId: sessionData.markerPattern.name, // this might need adjustment
              type: sessionData.markerPattern.type as 'custom' | 'hiro' | 'kanji'
            },
            metadata: {
              ...sessionData.metadata,
              actions: sessionData.metadata.actions?.map(action => ({
                ...action,
                type: action.type as 'purchase' | 'share' | 'claim' | 'info'
              })) || []
            },
            asset3D: sessionData.asset3D ? {
              ...sessionData.asset3D,
              type: sessionData.asset3D.type as 'glb' | 'gltf'
            } : undefined
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          isEdit={true}
        />

        {/* QR code generator modal */}
        <QRCodeGenerator
          arSession={sessionData}
          isOpen={showQRGenerator}
          onClose={() => setShowQRGenerator(false)}
          onSuccess={handleQRSuccess}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  
  return {
    props: {
      sessionId: id as string
    }
  };
};
