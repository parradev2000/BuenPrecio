import type { SafeUser } from '@buenprecio/shared';

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
};

const KEY = 'buenprecio.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

type Listener = (session: Session | null) => void;
let listeners: Listener[] = [];

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function notify(session: Session | null) {
  listeners.forEach((listener) => listener(session));
}