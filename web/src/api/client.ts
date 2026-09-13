import type { AuthResponse } from '@buenprecio/shared';
import { API_BASE } from '@buenprecio/shared';
import { clearSession, loadSession, notify, saveSession, type Session } from './session';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function rawRequest(path: string, init: RequestInit, session: Session | null) {
  const isForm = init.body instanceof FormData;
  const headers: Record<string, string> = { ...(init.body && !isForm ? { 'content-type': 'application/json' } : {}) };
  if (session) {
    headers.authorization = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(API_BASE + path, { ...init, headers });
  if (res.status === 204) {
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, (data as { message?: string } | null)?.message ?? 'Error inesperado');
  }
  return data;
}

async function tryRefresh(refreshToken: string): Promise<Session | null> {
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as AuthResponse;
    const next: Session = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
    saveSession(next);
    notify(next);
    return next;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;
  const session = auth ? loadSession() : null;
  if (auth && !session) {
    throw new ApiError(401, 'Inicia sesión para continuar');
  }
  const init: RequestInit = {
    method,
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  };
  try {
    return (await rawRequest(path, init, session)) as T;
  } catch (error) {
    if (auth && session && error instanceof ApiError && error.status === 401) {
      const next = await tryRefresh(session.refreshToken);
      if (next) {
        return (await rawRequest(path, init, next)) as T;
      }
      clearSession();
      notify(null);
      throw new ApiError(401, 'Tu sesión expiró, vuelve a entrar');
    }
    throw error;
  }
}