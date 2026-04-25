import type { PlatformSession } from '../session/session.types.js';

export function isAuthenticated(session: PlatformSession | null | undefined): session is PlatformSession {
  return Boolean(session);
}

export function requireSession(
  session: PlatformSession | null | undefined,
): PlatformSession {
  if (!session) {
    throw new Error('UNAUTHORIZED: session missing');
  }
  return session;
}
