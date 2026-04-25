export function createMockStorageAdapter() {
  return {
    get: async (_key: string) => undefined as unknown,
    set: async (_key: string, _value: unknown) => {},
    delete: async (_key: string) => {},
  };
}

export function createMockCacheClient() {
  return {
    get: async <T>(_key: string) => undefined as T | undefined,
    set: async (_key: string, _value: unknown, _ttlMs?: number) => {},
    del: async (_key: string) => {},
  };
}

export function createMockSearchService() {
  return {
    search: async (_query: string) => [] as unknown[],
    index: async (_doc: unknown) => {},
  };
}
