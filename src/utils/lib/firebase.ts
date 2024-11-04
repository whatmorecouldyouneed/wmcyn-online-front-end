import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getDatabase, Database, ref, push, set } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase only on the client side
let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Database | undefined;

if (typeof window !== 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    
    // Only initialize analytics if supported by the current environment
    isAnalyticsSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, analytics, db, ref, push, set };
