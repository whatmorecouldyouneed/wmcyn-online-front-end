import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, push, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// initialize firebase only on the client side
let app;
let analytics;
let db;

if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  db = getDatabase(app);
}

export { analytics, db, ref, push, set };
