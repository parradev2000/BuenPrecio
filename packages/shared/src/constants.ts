export const ROLE_NAMES = ['consumidor', 'productor', 'administrador'] as const;
export type Role = (typeof ROLE_NAMES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  consumidor: 'Consumidor',
  productor: 'Productor',
  administrador: 'Administrador',
};

export const CURRENCY = {
  code: 'CUP',
  symbol: '$',
  locale: 'es-CU',
} as const;

export const ITEM_UNITS = ['unidad', 'kg', 'litro', 'paquete'] as const;
export type ItemUnit = (typeof ITEM_UNITS)[number];

export const PRODUCER_APPLICATION_STATUS = ['pending', 'approved', 'rejected'] as const;
export type ProducerApplicationStatus = (typeof PRODUCER_APPLICATION_STATUS)[number];

export const API_BASE = '/api/v1';