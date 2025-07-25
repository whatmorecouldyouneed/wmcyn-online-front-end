import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getDatabase, Database, ref, push, set } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
};

// Initialize Firebase only on the client side
let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Database | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

if (typeof window !== 'undefined') {
  try {
    // Check if all required config values are present
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
    
    if (missingFields.length > 0) {
      console.error('Missing Firebase config fields:', missingFields);
      throw new Error(`Missing required Firebase config fields: ${missingFields.join(', ')}`);
    }

    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    firestore = getFirestore(app);
    
    // Only initialize analytics if supported by the current environment
    isAnalyticsSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    }).catch((error) => {
      console.warn('Firebase Analytics initialization failed:', error);
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, analytics, db, ref, push, set, auth, firestore };
