export function formatDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function toISOString(date: Date): string {
  return date.toISOString();
}
