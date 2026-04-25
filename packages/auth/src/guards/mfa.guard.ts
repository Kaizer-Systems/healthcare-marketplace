import type { PlatformSession, SecondFactor } from '../session/session.types.js';

export function requireFactor(
  session: PlatformSession | null | undefined,
  factors: readonly SecondFactor[],
): PlatformSession {
  if (!session) {
    throw new Error('UNAUTHORIZED: session missing');
  }
  if (!factors.includes(session.factorUsed)) {
    throw new Error(`MFA_REQUIRED: factor "${session.factorUsed}" not sufficient`);
  }
  return session;
}
