import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, firestore } from '../utils/lib/firebase';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

type AuthContextType = {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string) => {
    if (!auth) throw new Error('Authentication not initialized');
    if (!firestore) throw new Error('Firestore not initialized');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(firestore, 'users', userCredential.user.uid), { email });
    return userCredential;
  };

  const login = (email: string, password: string) => {
    if (!auth) throw new Error('Authentication not initialized');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    if (!auth) throw new Error('Authentication not initialized');
    return signOut(auth);
  };

  const googleSignIn = () => {
    if (!auth) throw new Error('Authentication not initialized');
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const resetPassword = (email: string) => {
    if (!auth) throw new Error('Authentication not initialized');
    return sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return () => {};
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!firestore) {
          console.error('Firestore not initialized');
          return;
        }
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, { email: user.email });
          // add mock products for testing
          await setDoc(doc(firestore, `users/${user.uid}/products`, 'mock1'), { name: 'WMCYN Hat', acquired: new Date().toISOString() });
          await setDoc(doc(firestore, `users/${user.uid}/products`, 'mock2'), { name: 'WMCYN Shirt', acquired: new Date().toISOString() });
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, signup, login, logout, googleSignIn, resetPassword };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 