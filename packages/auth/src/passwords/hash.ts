export const ARGON2_OPTIONS = {
  type: 2,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

export async function hashPassword(_plain: string): Promise<string> {
  throw new Error('NOT_IMPLEMENTED: passwords.hash.hashPassword');
}

export async function needsRehash(_hash: string): Promise<boolean> {
  throw new Error('NOT_IMPLEMENTED: passwords.hash.needsRehash');
}
