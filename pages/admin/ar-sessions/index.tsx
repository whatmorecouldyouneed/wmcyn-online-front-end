import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { arSessions as arSessionsAPI } from '@/lib/apiClient';
import { ARSessionData } from '@/types/arSessions';
import NextImage from '@/components/NextImage';
import styles from '@/styles/Admin.module.scss';

const WMCYNLOGO = '/wmcyn_logo_white.png';

export default function ARSessionsList() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ARSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // load ar sessions
  useEffect(() => {
    if (!isAuthenticated) return;
    
    loadARSessions();
  }, [isAuthenticated]);

  const loadARSessions = async () => {
    try {
      setLoading(true);
      const response = await arSessionsAPI.list();
      console.log('[ARSessionsList] Raw response:', response);
      
      // handle different response structures
      let sessions: ARSessionData[] = [];
      if (response && response.arSessions) {
        sessions = response.arSessions;
        console.log('[ARSessionsList] Using arSessions field:', sessions.length);
      } else if (response && Array.isArray(response)) {
        sessions = response;
        console.log('[ARSessionsList] Using direct array response:', sessions.length);
      } else {
        console.warn('[ARSessionsList] Unexpected response structure:', response);
        sessions = [];
      }
      
      setSessions(sessions);
    } catch (error: any) {
      console.error('failed to load ar sessions:', error);
      // provide more helpful error messages
      let errorMessage = error.message || 'failed to load ar sessions';
      if (error.message?.includes('NEXT_PUBLIC_ADMIN_API_TOKEN')) {
        errorMessage = 'AR sessions require admin authentication. Please configure NEXT_PUBLIC_ADMIN_API_TOKEN in your environment variables.';
      } else if (error.message?.includes('Forbidden')) {
        errorMessage = 'Access denied. AR sessions require admin privileges. Please check your authentication configuration.';
      }
      setError(errorMessage);
      setSessions([]); // ensure sessions is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/admin/ar-sessions/new');
  };

  const handleEdit = (sessionId: string) => {
    router.push(`/admin/ar-sessions/${sessionId}`);
  };

  const handleDelete = async (sessionId: string, sessionName: string) => {
    console.log('[ARSessionsList] Delete called with sessionId:', sessionId, 'sessionName:', sessionName);
    
    if (!sessionId) {
      console.error('[ARSessionsList] No sessionId provided for delete');
      alert('Error: No session ID provided');
      return;
    }
    
    if (!confirm(`are you sure you want to delete "${sessionName}"? this action cannot be undone.`)) {
      return;
    }

    try {
      console.log('[ARSessionsList] Deleting session:', sessionId);
      await arSessionsAPI.delete(sessionId);
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
      console.log('[ARSessionsList] Session deleted successfully');
    } catch (error: any) {
      console.error('failed to delete ar session:', error);
      alert('failed to delete ar session: ' + (error.message || 'unknown error'));
    }
  };

  const handleGenerateQR = (sessionId: string) => {
    router.push(`/admin/ar-sessions/${sessionId}?generateQR=true`);
  };

  // filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.campaign && session.campaign.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // group by campaign
  const sessionsByCampaign = filteredSessions.reduce((acc, session) => {
    const campaign = session.campaign || 'no campaign';
    if (!acc[campaign]) {
      acc[campaign] = [];
    }
    acc[campaign].push(session);
    return acc;
  }, {} as Record<string, ARSessionData[]>);

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
            <h1 className={styles.adminTitle}>ar sessions</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.buttonSecondary}
            >
              back to dashboard
            </button>
            <button 
              onClick={handleCreateNew}
              className={styles.buttonPrimary}
            >
              create ar session
            </button>
          </div>
        </div>

        {/* filters */}
        <div className={styles.filtersContainer}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterContainer}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">all statuses</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="draft">draft</option>
            </select>
          </div>
        </div>

        {/* content */}
        {loading ? (
          <div className={styles.loadingContainer}>
            loading ar sessions...
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <h3>error loading ar sessions</h3>
            <p>{error}</p>
            <button onClick={loadARSessions} className={styles.button}>
              try again
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className={styles.emptyContainer}>
            <h3>no ar sessions found</h3>
            <p>
              {searchTerm || statusFilter !== 'all' 
                ? 'try adjusting your search or filters'
                : 'create your first ar session to get started'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button onClick={handleCreateNew} className={styles.buttonPrimary}>
                create ar session
              </button>
            )}
          </div>
        ) : (
          <div className={styles.sessionsContainer}>
            {Object.entries(sessionsByCampaign).map(([campaign, campaignSessions]) => (
              <div key={campaign} className={styles.campaignSection}>
                <h2 className={styles.campaignTitle}>
                  {campaign} ({campaignSessions.length})
                </h2>
                <div className={styles.sessionsGrid}>
                  {campaignSessions.map((session) => (
                    <div key={session.sessionId} className={styles.sessionCard}>
                      <div className={styles.sessionHeader}>
                        <h3 className={styles.sessionTitle}>{session.metadata.title}</h3>
                        <span className={`${styles.statusBadge} ${styles[session.status]}`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <p className={styles.sessionDescription}>
                        {session.metadata.description}
                      </p>
                      
                      <div className={styles.sessionMeta}>
                        <div className={styles.metaRow}>
                          <span className={styles.metaLabel}>marker:</span>
                          <span className={styles.metaValue}>{session.markerPattern.name}</span>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaLabel}>created:</span>
                          <span className={styles.metaValue}>
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaLabel}>actions:</span>
                          <span className={styles.metaValue}>
                            {session.metadata.actions.length} configured
                          </span>
                        </div>
                      </div>
                      
                      <div className={styles.sessionActions}>
                        <button
                          onClick={() => handleEdit(session.sessionId)}
                          className={styles.actionButton}
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleGenerateQR(session.sessionId)}
                          className={styles.actionButton}
                        >
                          generate qr
                        </button>
                        <button
                          onClick={() => handleDelete(session.sessionId, session.metadata.title)}
                          className={`${styles.actionButton} ${styles.dangerButton}`}
                        >
                          delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
