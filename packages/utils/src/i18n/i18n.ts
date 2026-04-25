export type Locale = 'en' | string;

export const DEFAULT_LOCALE: Locale = 'en';

export function t(key: string, _locale?: Locale): string {
  return key;
}

export function getSupportedLocales(): Locale[] {
  return ['en'];
}
