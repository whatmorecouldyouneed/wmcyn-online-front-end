import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { auth } from '@/utils/lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

type AdminAuthContextType = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const session = sessionStorage.getItem('admin_session');
        if (session) {
          try {
            const sessionData = JSON.parse(session);
            // check if session is still valid (not expired)
            if (sessionData.expiresAt && new Date(sessionData.expiresAt) > new Date()) {
              // also check if Firebase user is authenticated
              if (auth?.currentUser) {
                console.log('[AdminAuth] Valid session and Firebase user found');
                setIsAuthenticated(true);
              } else {
                console.log('[AdminAuth] Valid session but no Firebase user, signing in anonymously...');
                try {
                  if (auth) await signInAnonymously(auth);
                  console.log('[AdminAuth] Firebase anonymous sign-in successful');
                  setIsAuthenticated(true);
                } catch (error) {
                  console.error('[AdminAuth] Failed to restore Firebase auth:', error);
                  // clear invalid session
                  sessionStorage.removeItem('admin_session');
                  setIsAuthenticated(false);
                }
              }
            } else {
              // session expired, clear it
              console.log('[AdminAuth] Session expired, clearing...');
              sessionStorage.removeItem('admin_session');
              setIsAuthenticated(false);
            }
          } catch (error) {
            // invalid session data, clear it
            console.error('[AdminAuth] Invalid session data:', error);
            sessionStorage.removeItem('admin_session');
            setIsAuthenticated(false);
          }
        } else {
          console.log('[AdminAuth] No admin session found');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // listen for Firebase auth state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = auth ? onAuthStateChanged(auth, (user) => {
      console.log('[AdminAuth] Firebase auth state changed:', user ? 'signed in' : 'signed out');
      
      // if user is signed out but we have a valid admin session, try to restore Firebase auth
      if (!user && isAuthenticated) {
        const session = sessionStorage.getItem('admin_session');
        if (session) {
          try {
            const sessionData = JSON.parse(session);
            if (sessionData.expiresAt && new Date(sessionData.expiresAt) > new Date()) {
              console.log('[AdminAuth] Restoring Firebase auth for valid admin session...');
              if (auth) signInAnonymously(auth).catch((error) => {
                console.error('[AdminAuth] Failed to restore Firebase auth:', error);
                // if we can't restore Firebase auth, clear the admin session
                sessionStorage.removeItem('admin_session');
                setIsAuthenticated(false);
              });
            } else {
              console.log('[AdminAuth] Admin session expired, clearing...');
              sessionStorage.removeItem('admin_session');
              setIsAuthenticated(false);
            }
          } catch (error) {
            console.error('[AdminAuth] Invalid session data during auth state change:', error);
            sessionStorage.removeItem('admin_session');
            setIsAuthenticated(false);
          }
        }
      }
    }) : () => {};

    return () => unsubscribe();
  }, [isAuthenticated]);

  const login = async (username: string, password: string): Promise<boolean> => {
    const adminUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('admin credentials not configured');
      return false;
    }

    if (username === adminUsername && password === adminPassword) {
      try {
        // sign in to Firebase anonymously for API access
        console.log('[AdminAuth] Attempting Firebase anonymous sign-in...');
        if (!auth) throw new Error('Firebase auth not initialized');
        const userCredential = await signInAnonymously(auth);
        console.log('[AdminAuth] Firebase anonymous sign-in successful:', userCredential.user?.uid);
        
        // verify we can get a token
        const token = await userCredential.user.getIdToken();
        console.log('[AdminAuth] Got Firebase token:', token ? 'present' : 'missing');
        
        // create session that expires in 24 hours
        const sessionData = {
          username,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          loginTime: new Date().toISOString()
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('admin_session', JSON.stringify(sessionData));
        }

        setIsAuthenticated(true);
        return true;
      } catch (error) {
        console.error('[AdminAuth] Failed to sign in to Firebase:', error);
        return false;
      }
    }

    return false;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_session');
    }
    // sign out of Firebase
    if (auth?.currentUser) {
      auth.signOut();
    }
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  const value = {
    isAuthenticated,
    login,
    logout,
    loading
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// helper function to check auth status outside of React context
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const session = sessionStorage.getItem('admin_session');
  if (!session) return false;

  try {
    const sessionData = JSON.parse(session);
    return sessionData.expiresAt && new Date(sessionData.expiresAt) > new Date();
  } catch {
    return false;
  }
}
