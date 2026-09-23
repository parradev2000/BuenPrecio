import { CURRENCY } from '@buenprecio/shared';
import { API_BASE } from '../config';

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
    const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
    return `${origin}${value}`;
  }
  return null;
}

export const COLORS = {
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  primary: '#059669',
  primaryDark: '#047857',
  danger: '#dc2626',
  dangerDark: '#b91c1c',
  successBg: '#ecfdf5',
  successFg: '#047857',
  warningBg: '#fffbeb',
  warningFg: '#b45309',
  dangerBg: '#fef2f2',
  dangerFg: '#b91c1c',
  neutralBg: '#f1f5f9',
  neutralFg: '#475569',
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