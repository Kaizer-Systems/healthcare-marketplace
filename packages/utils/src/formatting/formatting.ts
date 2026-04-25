export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export const DEFAULT_CURRENCY: Currency = 'INR';

export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}
