import { ActionCodeSettings, Auth, sendPasswordResetEmail } from 'firebase/auth';

export const PASSWORD_MIN_LENGTH = 6;

export const RESET_SENT_NOTICE =
  'if that email has an account, a password reset link is on its way';

export const PASSWORD_UPDATED_NOTICE = 'password updated. sign in with your new password.';

// wmcyn.online is already an authorized domain. the continue url brings people
// back to sign in after the new password is saved. the email link itself opens
// /reset-password when the firebase action url points there.
export const PASSWORD_RESET_CONTINUE_URL = 'https://wmcyn.online/login?reset=1';

export function passwordResetActionCodeSettings(): ActionCodeSettings {
  return {
    url: PASSWORD_RESET_CONTINUE_URL,
    handleCodeInApp: false,
  };
}

export function passwordResetRequestError(error: { code?: string }): string {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'invalid email address';
    case 'auth/missing-email':
      return 'enter your email';
    case 'auth/too-many-requests':
      return 'too many attempts, try again later';
    case 'auth/network-request-failed':
      return 'network error, check your connection';
    case 'auth/unauthorized-continue-uri':
    case 'auth/invalid-continue-uri':
      return 'password reset is not available from this site yet';
    default:
      return 'could not send reset email, try again';
  }
}

export function passwordResetLinkError(error: { code?: string }): string {
  switch (error?.code) {
    case 'auth/expired-action-code':
      return 'this reset link has expired. request a new one.';
    case 'auth/invalid-action-code':
      return 'this reset link has already been used or is no longer valid. request a new one.';
    case 'auth/user-disabled':
      return 'this account is disabled.';
    case 'auth/weak-password':
      return `password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    default:
      return 'this reset link does not work. request a new one.';
  }
}

export async function requestPasswordReset(auth: Auth, email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('enter your email');
  }

  try {
    await sendPasswordResetEmail(auth, trimmed, passwordResetActionCodeSettings());
  } catch (error: any) {
    // same notice either way, so the form does not reveal which emails exist
    if (error?.code === 'auth/user-not-found') return;
    if (error?.code === 'auth/configuration-not-found') {
      throw new Error('firebase authentication is not configured.');
    }
    throw new Error(passwordResetRequestError(error));
  }
}
