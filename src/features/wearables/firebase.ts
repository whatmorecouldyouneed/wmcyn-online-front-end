import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Deliberately uses the API/iOS project, not the storefront's default app.
export function wearableFirebase() {
  const projectId = process.env.NEXT_PUBLIC_BACKEND_FIREBASE_PROJECT_ID || 'wmcyn-online-mobile';
  const app = getApps().find(a => a.name === 'wearables') || initializeApp({
    apiKey: process.env.NEXT_PUBLIC_BACKEND_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_BACKEND_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    appId: process.env.NEXT_PUBLIC_BACKEND_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_WEARABLES_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`,
  }, 'wearables');
  return {auth: getAuth(app), database: getDatabase(app)};
}
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';
