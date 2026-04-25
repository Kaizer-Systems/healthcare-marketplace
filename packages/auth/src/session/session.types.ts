import type { Role } from '../roles/roles.constants.js';

export type AuthMethod =
  | 'credentials'
  | 'email-otp'
  | 'phone-otp'
  | 'google'
  | 'webauthn'
  | 'magic-link';

export type SecondFactor =
  | 'email-otp'
  | 'phone-otp'
  | 'totp'
  | 'none';

export interface PlatformSession {
  userId: string;
  role: Role;
  sellerId?: string;
  method: AuthMethod;
  verified: boolean;
  factorUsed: SecondFactor;
  mfaEnrolled: SecondFactor[];
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}
