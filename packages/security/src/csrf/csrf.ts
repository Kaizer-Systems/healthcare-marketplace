export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

export function validateCsrfToken(token: string, expected: string): boolean {
  return token === expected;
}
