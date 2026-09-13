import { CURRENCY } from '@buenprecio/shared';

export function currencySymbol() {
  return CURRENCY.symbol;
}

export function formatPrice(price: number) {
  return `${CURRENCY.symbol}${price.toLocaleString('es-CU')}`;
}