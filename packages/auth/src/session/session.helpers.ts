import type { PlatformSession, SecondFactor } from './session.types.js';

export function isVerified(session: PlatformSession | null | undefined): boolean {
  return Boolean(session && session.verified === true);
}

export function factorOf(session: PlatformSession | null | undefined): SecondFactor {
  return session?.factorUsed ?? 'none';
}

export function promote(
  session: PlatformSession,
  factorUsed: SecondFactor,
): PlatformSession {
  return { ...session, verified: true, factorUsed };
}

export function demote(session: PlatformSession): PlatformSession {
  return { ...session, verified: false, factorUsed: 'none' };
}
