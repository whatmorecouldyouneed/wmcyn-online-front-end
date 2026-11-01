import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  passwordResetLinkError,
  passwordResetRequestError,
} from './password-reset';

describe('password reset messages', () => {
  it('keeps request errors in plain language', () => {
    expect(passwordResetRequestError({ code: 'auth/invalid-email' })).toBe('invalid email address');
    expect(passwordResetRequestError({ code: 'auth/too-many-requests' })).toBe(
      'too many attempts, try again later'
    );
    expect(passwordResetRequestError({ code: 'auth/internal-error' })).toBe(
      'could not send reset email, try again'
    );
  });

  it('explains a dead reset link and a short password', () => {
    expect(passwordResetLinkError({ code: 'auth/expired-action-code' })).toBe(
      'this reset link has expired. request a new one.'
    );
    expect(passwordResetLinkError({ code: 'auth/invalid-action-code' })).toBe(
      'this reset link has already been used or is no longer valid. request a new one.'
    );
    expect(passwordResetLinkError({ code: 'auth/weak-password' })).toBe(
      `password must be at least ${PASSWORD_MIN_LENGTH} characters`
    );
  });
});
