import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getMyProfile, getInventory, markerPatterns } from "@/lib/apiClient";

export default function ApiTest() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [markerTestResults, setMarkerTestResults] = useState<any>(null);
  const [markerLoading, setMarkerLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  const testApiEndpoint = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      console.log('[API TEST] Testing profile endpoint...');
      const profile = await getMyProfile();
      console.log('[API TEST] Profile:', profile);
      
      console.log('[API TEST] Testing inventory endpoint...');
      const inventory = await getInventory(true);
      console.log('[API TEST] Inventory:', inventory);
      
      console.log('[API TEST] Testing marker patterns endpoint...');
      const markerPatternsList = await markerPatterns.list();
      console.log('[API TEST] Marker Patterns:', markerPatternsList);
      
      setTestResults({
        profile,
        inventory,
        markerPatterns: markerPatternsList,
        success: true,
        apiBase: process.env.NEXT_PUBLIC_API_BASE
      });
      
    } catch (error: any) {
      console.error('[API TEST] Error:', error);
      setTestResults({
        error: error.message,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  const testMarkerEndpoints = async () => {
    setMarkerLoading(true);
    setMarkerTestResults(null);
    
    try {
      console.log('[MARKER TEST] Testing marker patterns list...');
      const markerPatternsList = await markerPatterns.list();
      console.log('[MARKER TEST] Marker Patterns List:', markerPatternsList);
      
      // test marker upload with a simple test image
      console.log('[MARKER TEST] Testing marker upload...');
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1 transparent PNG
      
      const uploadRequest = {
        name: 'Test Marker - API Integration',
        description: 'Test marker generated from API test page',
        type: 'upload' as const,
        imageFile: {
          data: testImageData.split(',')[1], // remove data:image/png;base64, prefix
          mimeType: 'image/png',
          filename: 'test-marker.png'
        },
        generationConfig: {
          patternRatio: 0.5,
          imageSize: 256,
          borderColor: '#000000',
          source: 'manual' as const
        },
        validation: {
          tested: false
        }
      };
      
      const uploadResult = await markerPatterns.upload(uploadRequest);
      console.log('[MARKER TEST] Upload Result:', uploadResult);
      
      setMarkerTestResults({
        markerPatternsList,
        uploadResult,
        success: true,
        apiBase: process.env.NEXT_PUBLIC_API_BASE
      });
      
    } catch (error: any) {
      console.error('[MARKER TEST] Error:', error);
      setMarkerTestResults({
        error: error.message,
        success: false
      });
    } finally {
      setMarkerLoading(false);
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
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
            fontFamily: 'inherit'
          }}
        >
          {loading ? 'Testing...' : 'Test API Endpoint'}
        </button>
        
        <button 
          onClick={testMarkerEndpoints}
          disabled={markerLoading}
          style={{
            background: markerLoading ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 255, 150, 0.2)',
            border: '1px solid rgba(0, 255, 150, 0.3)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '8px',
            cursor: markerLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontFamily: 'inherit'
          }}
        >
          {markerLoading ? 'Testing...' : 'Test Marker Endpoints'}
        </button>
      </div>

      {testResults && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>API Test Results</h2>
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

      {markerTestResults && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#00ff96' }}>Marker Endpoint Test Results</h2>
          <pre style={{ 
            background: 'rgba(0, 255, 150, 0.1)', 
            padding: '1rem', 
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px',
            border: '1px solid rgba(0, 255, 150, 0.2)'
          }}>
            {JSON.stringify(markerTestResults, null, 2)}
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
