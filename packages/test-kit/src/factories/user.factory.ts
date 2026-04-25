export function createTestUser(overrides?: Partial<{ id: string; email: string; name: string; role: string }>) {
  return {
    id: overrides?.id ?? 'usr_test_default',
    email: overrides?.email ?? 'user@example.com',
    name: overrides?.name ?? 'Test User',
    role: overrides?.role ?? 'patient',
  };
}
