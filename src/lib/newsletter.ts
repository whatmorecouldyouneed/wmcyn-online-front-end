import { ref, set } from 'firebase/database';
import { db } from '@/utils/lib/firebase';

// the list can't be read from the browser, so duplicates are caught on write instead: each
// address gets one key (a hash of the email) and the rules only allow creating a key once
export async function newsletterKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type SubscribeResult = 'subscribed' | 'already_subscribed';

export async function subscribeToNewsletter(email: string, details: Record<string, string | number>): Promise<SubscribeResult> {
  if (!db) throw new Error('Firebase not initialized');
  try {
    await set(ref(db, `emailList/${await newsletterKey(email)}`), { email: email.trim(), timestamp: Date.now(), ...details });
    return 'subscribed';
  } catch (error: any) {
    if (/permission/i.test(String(error?.code || error?.message || ''))) return 'already_subscribed';
    throw error;
  }
}
