import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
export const REFRESH_TOKEN_TTL_DAYS = 30;

export function refreshExpiryInMs(): number {
  return Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}