import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useInventory } from "@/hooks/useInventory";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function DebugProfile() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const p = useProfile();
  const inv = useInventory(true);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null; // will redirect to login
  }

  return (
    <main style={{ 
      padding: 24, 
      color: 'white', 
      fontFamily: 'var(--font-outfit), sans-serif',
      background: 'linear-gradient(180deg, rgba(20,20,30,1), rgba(10,10,15,1))',
      minHeight: '100vh'
    }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>/debug/profile</h1>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Profile</h2>
        <pre style={{ 
          background: 'rgba(30, 35, 50, 0.8)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {JSON.stringify({ loading: p.loading, error: p.error, data: p.data }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Inventory</h2>
        <pre style={{ 
          background: 'rgba(30, 35, 50, 0.8)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {JSON.stringify({ loading: inv.loading, error: inv.error, items: inv.items }, null, 2)}
        </pre>
      </div>

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
    </main>
  );
}
