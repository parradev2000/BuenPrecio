import { CURRENCY } from '@buenprecio/shared';
import { getApiBase } from '../config';

export function formatPrice(price: number) {
  return `${CURRENCY.symbol}${price.toLocaleString('es-CU')}`;
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toLocaleString('es-CU', { maximumFractionDigits: 1 })} km`;
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
  successBg: '#e7f6ee',
  successFg: '#08663e',
  warningBg: '#fdf3e0',
  warningFg: '#8a5a00',
  dangerBg: '#fdecec',
  dangerFg: '#a52925',
  neutralBg: '#eef0f3',
  neutralFg: '#5a6572',
};

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export function badgeColors(tone: BadgeTone) {
  switch (tone) {
    case 'success':
      return { bg: COLORS.successBg, fg: COLORS.successFg };
    case 'warning':
      return { bg: COLORS.warningBg, fg: COLORS.warningFg };
    case 'danger':
      return { bg: COLORS.dangerBg, fg: COLORS.dangerFg };
    case 'neutral':
      return { bg: COLORS.neutralBg, fg: COLORS.neutralFg };
  }
}