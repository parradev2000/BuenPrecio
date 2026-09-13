import { CURRENCY } from '@buenprecio/shared';
import { getApiBase } from '../config';

export function formatPrice(price: number) {
  return `${CURRENCY.symbol}${price.toLocaleString('es-CU')}`;
}

export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) {
    const origin = getApiBase().replace(/\/api\/v1\/?$/, '');
    return `${origin}${value}`;
  }
  return null;
}

export const COLORS = {
  bg: '#f6f7f9',
  card: '#ffffff',
  text: '#1c2430',
  muted: '#6b7684',
  border: '#e2e6ec',
  primary: '#0b7a4b',
  primaryDark: '#08663e',
  danger: '#c0302b',
  dangerDark: '#a52925',
};