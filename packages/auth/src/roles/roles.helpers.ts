import { ROLES, type Role } from './roles.constants.js';

const ROLE_RANK: Record<Role, number> = {
  public: 0,
  customer: 1,
  doctor: 2,
  seller_staff: 3,
  seller_admin: 4,
  provider_support: 5,
  provider_admin: 6,
  super_admin: 7,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function hasRole(userRole: Role, required: Role): boolean {
  return userRole === required;
}

export function hasAnyRole(userRole: Role, required: readonly Role[]): boolean {
  return required.includes(userRole);
}

export function hasMinimumRole(userRole: Role, minimum: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
}
