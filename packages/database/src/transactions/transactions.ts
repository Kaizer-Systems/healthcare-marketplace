export async function withTransaction<T>(fn: (session: unknown) => Promise<T>): Promise<T> {
  return fn(null as unknown);
}
