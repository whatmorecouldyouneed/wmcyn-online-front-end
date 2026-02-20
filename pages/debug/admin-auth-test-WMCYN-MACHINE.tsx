import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getProductSets, arSessions as arSessionsAPI } from "@/lib/apiClient";

export default function AdminAuthTest() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const testAdminEndpoints = async () => {
    setLoading(true);
    setTestResults(null);
    
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        apiBase: process.env.NEXT_PUBLIC_API_BASE,
        hasAdminToken: !!process.env.NEXT_PUBLIC_ADMIN_API_TOKEN,
        hasDevXUid: !!process.env.NEXT_PUBLIC_DEV_X_UID
      }
    };
    
    try {
      console.log('[ADMIN AUTH TEST] Testing product sets endpoint...');
      const productSets = await getProductSets();
      console.log('[ADMIN AUTH TEST] Product sets:', productSets);
      results.productSets = {
        success: true,
        count: productSets.productSets?.length || 0,
        data: productSets
      };
    } catch (error: any) {
      console.error('[ADMIN AUTH TEST] Product sets error:', error);
      results.productSets = {
        success: false,
        error: error.message
      };
    }
    
    try {
      console.log('[ADMIN AUTH TEST] Testing AR sessions endpoint...');
      const arSessions = await arSessionsAPI.list();
      console.log('[ADMIN AUTH TEST] AR sessions:', arSessions);
      results.arSessions = {
        success: true,
        count: arSessions.arSessions?.length || 0,
        data: arSessions
      };
    } catch (error: any) {
      console.error('[ADMIN AUTH TEST] AR sessions error:', error);
      results.arSessions = {
        success: false,
        error: error.message
      };
    }
    
    setTestResults(results);
    setLoading(false);
  };

  if (authLoading) {
    return (
      <main style={{ 
        padding: 24, 
        color: 'white', 
        fontFamily: 'var(--font-outfit), sans-serif',
        background: 'linear-gradient(180deg, rgba(20,20,30,1), rgba(10,10,15,1))',
        minHeight: '100vh'
      }}>
        <h1>Loading...</h1>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main style={{ 
      padding: 24, 
      color: 'white', 
      fontFamily: 'var(--font-outfit), sans-serif',
      background: 'linear-gradient(180deg, rgba(20,20,30,1), rgba(10,10,15,1))',
      minHeight: '100vh'
    }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>/debug/admin-auth-test</h1>

      <div style={{ 
        marginBottom: '2rem', 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.05)', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '8px'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Environment Configuration</h3>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>
          <strong>API Base:</strong> {process.env.NEXT_PUBLIC_API_BASE || 'Not set'}
        </p>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>
          <strong>Admin Token:</strong> {process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ? 'Configured' : 'Not configured'}
        </p>
        <p style={{ margin: '0', fontSize: '0.9rem' }}>
          <strong>Dev X-UID:</strong> {process.env.NEXT_PUBLIC_DEV_X_UID ? 'Configured' : 'Not configured'}
        </p>
      </div>

      <button 
        onClick={testAdminEndpoints}
        disabled={loading}
        style={{
          background: loading ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontFamily: 'inherit',
          marginBottom: '2rem'
        }}
      >
        {loading ? 'Testing...' : 'Test Admin Endpoints'}
      </button>

      {testResults && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Test Results</h2>
          <pre style={{ 
            background: 'rgba(30, 35, 50, 0.8)', 
            padding: '1rem', 
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxHeight: '600px'
          }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => router.push('/admin')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
            marginRight: '1rem'
          }}
        >
          back to admin dashboard
        </button>
        
        <button 
          onClick={() => router.push('/debug/api-test')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
        >
          back to api-test
        </button>
      </div>
    </main>
  );
}

