import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { backendAuth } from '@/utils/lib/firebase';
import { getAdminProfile } from '@/lib/apiClient';

const ADMIN_ROLES = ['founder', 'admin'];

type AdminAuthContextType = {
  user: User | null;
  roles: string[];
  // true only for a signed-in founder or admin; the api enforces the same check on every write
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

function signInErrorMessage(error: any): string {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'incorrect email or password';
    case 'auth/too-many-requests':
      return 'too many failed attempts, try again later';
    case 'auth/network-request-failed':
      return 'network error, check your connection';
    default:
      return error?.message || 'sign in failed, please try again';
  }
}

async function loadAdminRoles(user: User): Promise<string[]> {
  const claims = (await user.getIdTokenResult()).claims;
  const profile = await getAdminProfile();
  if (profile.hasAccess === false) return [];
  const roles = new Set<string>(Array.isArray(profile.roles) ? profile.roles : []);
  if (typeof claims.role === 'string') roles.add(claims.role);
  return Array.from(roles);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveUser = useCallback(async (next: User | null) => {
    if (!next) {
      setUser(null);
      setRoles([]);
      return;
    }
    try {
      const nextRoles = await loadAdminRoles(next);
      if (!nextRoles.some((role) => ADMIN_ROLES.includes(role))) {
        setError('this account does not have admin access');
        setUser(null);
        setRoles([]);
        if (backendAuth) await signOut(backendAuth);
        return;
      }
      setError(null);
      setUser(next);
      setRoles(nextRoles);
    } catch (err: any) {
      setError(err?.message || 'could not verify admin access');
      setUser(null);
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    if (!backendAuth) {
      setError('admin sign-in is not configured');
      setLoading(false);
      return;
    }
    return onAuthStateChanged(backendAuth, async (next) => {
      setLoading(true);
      await resolveUser(next);
      setLoading(false);
    });
  }, [resolveUser]);

  const login = async (email: string, password: string) => {
    if (!backendAuth) throw new Error('admin sign-in is not configured');
    setError(null);
    try {
      await signInWithEmailAndPassword(backendAuth, email.trim(), password);
    } catch (err: any) {
      throw new Error(signInErrorMessage(err));
    }
    // onAuthStateChanged resolves roles; surface a refusal to the caller too
    const current = backendAuth.currentUser;
    const nextRoles = current ? await loadAdminRoles(current).catch(() => []) : [];
    if (!nextRoles.some((role) => ADMIN_ROLES.includes(role))) {
      throw new Error('this account does not have admin access');
    }
  };

  const logout = async () => {
    if (backendAuth) await signOut(backendAuth);
    router.push('/admin/login');
  };

  const resetPassword = async (email: string) => {
    if (!backendAuth) throw new Error('admin sign-in is not configured');
    try {
      await sendPasswordResetEmail(backendAuth, email.trim());
    } catch (err: any) {
      throw new Error(signInErrorMessage(err));
    }
  };

  const value: AdminAuthContextType = {
    user,
    roles,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    resetPassword,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
