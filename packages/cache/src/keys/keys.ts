export type CacheKeyVersion = string;

export const PRODUCT_KEY = 'product';
export const CATEGORY_KEY = 'category';
export const SELLER_KEY = 'seller';
export const SESSION_KEY = 'session';
export const SEARCH_KEY = 'search';

export function buildCacheKey(prefix: string, id: string, version?: string): string {
  return `${prefix}:${id}:v${version ?? '1'}`;
}
