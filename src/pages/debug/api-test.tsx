import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ApiTest() {
  const { currentUser, getIdToken } = useAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  const testApiEndpoint = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // Test 1: Get token
      const token = await getIdToken();
      console.log('[API TEST] Token:', token ? `${token.substring(0, 20)}...` : 'null');
      
      // Test 2: Test API base URL
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      console.log('[API TEST] API Base URL:', apiBase);
      
      // Test 3: Make direct fetch call (using proxy in development)
      const testUrl = process.env.NODE_ENV === 'development' 
        ? '/api/profile'
        : `${apiBase}/v1/profile/me`;
        
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[API TEST] Response status:', response.status);
      console.log('[API TEST] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('[API TEST] Response body:', responseText);
      
      setTestResults({
        token: token ? `${token.substring(0, 20)}...` : 'null',
        apiBase,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        success: response.ok
      });
      
    } catch (error: any) {
      console.error('[API TEST] Error:', error);
      setTestResults({
        error: error?.message || 'Unknown error',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
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
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>/debug/api-test</h1>

      <button 
        onClick={testApiEndpoint}
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
        {loading ? 'Testing...' : 'Test API Endpoint'}
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
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => router.push('/debug/profile')}
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
          back to debug/profile
        </button>
        
        <button 
          onClick={() => router.push('/dashboard')}
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
          back to dashboard
        </button>
      </div>
    </main>
  );
}
