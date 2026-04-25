import { getConfig } from '@grip-health/config';

export type DataSource = 'seed' | 'api';

export function resolveDataSource(): DataSource {
  const config = getConfig();
  if (config.APP_RUNTIME_MODE === 'dev-lite') return 'seed';
  if (config.APP_RUNTIME_MODE === 'dev-module' && !config.USE_REAL_API) return 'seed';
  return 'api';
}

export async function fetchData<T>(endpoint: string, seedFn: () => T | Promise<T>): Promise<T> {
  const source = resolveDataSource();
  if (source === 'seed') return seedFn();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${apiUrl}${endpoint}`);
  return response.json() as Promise<T>;
}
