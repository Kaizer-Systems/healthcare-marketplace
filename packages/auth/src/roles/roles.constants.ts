export const ROLES = [
  'public',
  'customer',
  'doctor',
  'seller_staff',
  'seller_admin',
  'provider_support',
  'provider_admin',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];
