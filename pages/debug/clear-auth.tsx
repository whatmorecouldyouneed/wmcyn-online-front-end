import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ClearAuth() {
  const { logout } = useAuth();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  const clearEverything = async () => {
    setClearing(true);
    try {
      // Sign out from Firebase
      await logout();
      
      // Clear all local storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      console.log('[ClearAuth] All auth state cleared');
      
      // Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 1000);
      
    } catch (error) {
      console.error('[ClearAuth] Error:', error);
    } finally {
      setClearing(false);
    }
  };

  return (
    <main style={{ 
      padding: 24, 
      color: 'white', 
      fontFamily: 'var(--font-outfit), sans-serif',
      background: 'linear-gradient(180deg, rgba(20,20,30,1), rgba(10,10,15,1))',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem'
    }}>
      <h1 style={{ fontSize: '2rem' }}>Clear Auth State</h1>
      
      <p style={{ textAlign: 'center', maxWidth: 500 }}>
        This will sign you out and clear all cached authentication data.
        Use this if you&apos;re getting &quot;invalid token&quot; errors after switching Firebase projects.
      </p>

      <button 
        onClick={clearEverything}
        disabled={clearing}
        style={{
          background: clearing ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 100, 100, 0.3)',
          border: '1px solid rgba(255, 100, 100, 0.5)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          cursor: clearing ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontFamily: 'inherit'
        }}
      >
        {clearing ? 'Clearing...' : 'Clear Auth & Sign Out'}
      </button>
      
      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => router.push('/login')}
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
          back to login
        </button>
      </div>
    </main>
  );
}
