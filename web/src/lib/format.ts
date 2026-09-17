import { CURRENCY } from '@buenprecio/shared';

export function currencySymbol() {
  return CURRENCY.symbol;
}

export function formatPrice(price: number) {
  return `${CURRENCY.symbol}${price.toLocaleString('es-CU')}`;
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toLocaleString('es-CU', { maximumFractionDigits: 1 })} km`;
}