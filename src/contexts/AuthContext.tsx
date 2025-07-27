import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, firestore } from '../utils/lib/firebase';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
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
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Try to save user data to Firestore
      try {
        await setDoc(doc(firestore, 'users', userCredential.user.uid), { email });
      } catch (firestoreError: any) {
        console.error('Failed to save user data to Firestore:', firestoreError);
        if (firestoreError.code === 'unavailable' || firestoreError.message?.includes('400')) {
          console.error('Firestore database may not be properly configured. User created but profile not saved.');
        }
        // Continue - authentication still succeeded even if Firestore failed
      }
      
      return userCredential;
    } catch (error: any) {
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication is not configured. Please enable Authentication in Firebase Console.');
      }
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Firebase Authentication. Please add your domain to the authorized domains list in Firebase Console.');
      }
      throw error;
    }
  };

  const login = (email: string, password: string) => {
    if (!auth) throw new Error('authentication not initialized');
    
    return signInWithEmailAndPassword(auth, email, password).catch((error: any) => {
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('firebase authentication is not configured. please enable authentication in firebase console.');
      }
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('this domain is not authorized for firebase authentication. please add your domain to the authorized domains list in firebase console.');
      }
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('incorrect password, try again');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('no account found with this email');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('invalid email address');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('too many failed attempts, please try again later');
      }
      throw error;
    });
  };

  const logout = () => {
    if (!auth) throw new Error('Authentication not initialized');
    return signOut(auth);
  };

  const googleSignIn = async () => {
    if (!auth) throw new Error('authentication not initialized');
    const provider = new GoogleAuthProvider();
    
    try {
      // try popup first - it's more reliable and immediate
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (popupError: any) {
      // if popup is blocked, fall back to redirect
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider);
          // redirect will happen, so this function won't return
        } catch (redirectError: any) {
          throw redirectError;
        }
      } else {
        // other types of errors (config, domain, etc.)
        if (popupError.code === 'auth/configuration-not-found') {
          throw new Error('firebase authentication is not configured. please enable authentication in firebase console.');
        }
        if (popupError.code === 'auth/unauthorized-domain') {
          throw new Error('this domain is not authorized for firebase authentication. please add your domain to the authorized domains list in firebase console.');
        }
        throw new Error('google sign-in failed, please try again');
      }
    }
  };

  const resetPassword = (email: string) => {
    if (!auth) throw new Error('Authentication not initialized');
    
    return sendPasswordResetEmail(auth, email).catch((error: any) => {
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication is not configured. Please enable Authentication in Firebase Console.');
      }
      throw error;
    });
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return () => {};
    }

    // handle Google sign-in redirect result on page load
    const handleRedirectResult = async () => {
      if (!auth) return;
      
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // onAuthStateChanged will handle the user state and firestore setup
        }
      } catch (error: any) {
        // store the error so it can be retrieved by the login page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('googleSignInError', error.message || 'google sign-in failed');
        }
      }
    };

    // add a small delay to ensure auth is fully initialized
    setTimeout(handleRedirectResult, 100);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!firestore) {
          console.error('firestore not initialized - user data cannot be saved');
          setCurrentUser(user);
          setLoading(false);
          return;
        }
        
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, { email: user.email });
            // add mock products for testing
            await setDoc(doc(firestore, `users/${user.uid}/products`, 'mock1'), { name: 'WMCYN Hat', acquired: new Date().toISOString() });
            await setDoc(doc(firestore, `users/${user.uid}/products`, 'mock2'), { name: 'WMCYN Shirt', acquired: new Date().toISOString() });
          }
        } catch (error: any) {
          console.error('firestore operation failed:', error);
          if (error.code === 'unavailable' || error.message?.includes('400')) {
            console.error('firestore database may not be properly configured. please check firebase console.');
          }
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