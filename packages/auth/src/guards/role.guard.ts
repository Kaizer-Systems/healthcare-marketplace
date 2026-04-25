import type { PlatformSession } from '../session/session.types.js';
import { hasAnyRole } from '../roles/roles.helpers.js';
import type { Role } from '../roles/roles.constants.js';

export function requireRole(
  session: PlatformSession | null | undefined,
  roles: readonly Role[],
): PlatformSession {
  if (!session) {
    throw new Error('UNAUTHORIZED: session missing');
  }
  if (!hasAnyRole(session.role, roles)) {
    throw new Error(`FORBIDDEN: role "${session.role}" not permitted`);
  }
  return session;
}
