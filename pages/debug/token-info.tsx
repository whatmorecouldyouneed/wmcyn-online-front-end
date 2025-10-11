import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth } from "@/utils/lib/firebase";

export default function TokenInfo() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  const getTokenInfo = async () => {
    if (!auth?.currentUser) {
      setTokenInfo({ error: 'No current user' });
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const tokenResult = await auth.currentUser.getIdTokenResult();
      
      // Decode JWT payload (base64)
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      setTokenInfo({
        token,
        claims: tokenResult.claims,
        payload,
        issuedAt: new Date(Number(payload.iat) * 1000).toISOString(),
        expiresAt: new Date(Number(payload.exp) * 1000).toISOString(),
        userId: payload.user_id,
        email: payload.email,
        projectId: payload.aud,
      });
      
      console.log('[TokenInfo] Full token:', token);
      console.log('[TokenInfo] Decoded payload:', payload);
      
    } catch (error: any) {
      setTokenInfo({ error: error.message });
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
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>/debug/token-info</h1>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Current User</h2>
        <pre style={{ 
          background: 'rgba(30, 35, 50, 0.8)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            emailVerified: currentUser.emailVerified
          }, null, 2)}
        </pre>
      </div>

      <button 
        onClick={getTokenInfo}
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
        {loading ? 'Getting Token Info...' : 'Get Token Info'}
      </button>

      {tokenInfo && !tokenInfo.error && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Token Information</h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Full Token (copy this for backend testing)</h3>
            <textarea 
              readOnly
              value={tokenInfo.token}
              style={{ 
                width: '100%',
                minHeight: '100px',
                background: 'rgba(30, 35, 50, 0.8)', 
                padding: '1rem', 
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Token Details</h3>
            <pre style={{ 
              background: 'rgba(30, 35, 50, 0.8)', 
              padding: '1rem', 
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {JSON.stringify({
                userId: tokenInfo.userId,
                email: tokenInfo.email,
                projectId: tokenInfo.projectId,
                issuedAt: tokenInfo.issuedAt,
                expiresAt: tokenInfo.expiresAt,
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Full Payload</h3>
            <pre style={{ 
              background: 'rgba(30, 35, 50, 0.8)', 
              padding: '1rem', 
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {JSON.stringify(tokenInfo.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {tokenInfo?.error && (
        <div style={{ color: '#ff6b6b' }}>
          Error: {tokenInfo.error}
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
