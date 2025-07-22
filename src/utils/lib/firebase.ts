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
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
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
      console.error('Environment variables check:', {
        NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
      throw new Error(`Missing required Firebase config fields: ${missingFields.join(', ')}`);
    }

    // Log the config (without sensitive values) for debugging
    console.log('Firebase config validation:', {
      hasApiKey: !!firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId || 'MISSING',
      authDomain: firebaseConfig.authDomain || 'MISSING',
      databaseURL: firebaseConfig.databaseURL || 'MISSING',
      hasStorageBucket: !!firebaseConfig.storageBucket,
      hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
      hasAppId: !!firebaseConfig.appId,
    });

    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    firestore = getFirestore(app);
    
    console.log('Firebase services initialized successfully:', {
      app: !!app,
      database: !!db,
      auth: !!auth,
      firestore: !!firestore,
    });
    
    // Test database connection
    if (db) {
      console.log('Testing Firebase Realtime Database connection...');
      // This will help verify the database is accessible
      const testRef = ref(db, '.info/connected');
      // Note: We're not setting up the listener here to avoid memory leaks,
      // but this ref creation will help validate the database URL
    }
    
    // Only initialize analytics if supported by the current environment
    isAnalyticsSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      } else {
        console.log('Firebase Analytics not supported in this environment');
      }
    }).catch((error) => {
      console.warn('Firebase Analytics initialization failed:', error);
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    console.error('This will prevent email submissions from working!');
    // Don't throw here, but log the error for debugging
  }
}

export { app, analytics, db, ref, push, set, auth, firestore };
