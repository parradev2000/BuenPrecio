import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse } from '@buenprecio/shared';
import { api } from '../api/client';
import { clearSession, loadSession, notify, saveSession, subscribe, type Session } from '../api/session';

type AuthContextValue = {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(data: AuthResponse): Session {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  useEffect(() => subscribe(setSession), []);

  async function login(email: string, password: string) {
    const data = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
    const next = toSession(data);
    saveSession(next);
    setSession(next);
  }

  async function register(name: string, email: string, password: string) {
    const data = await api<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } });
    const next = toSession(data);
    saveSession(next);
    setSession(next);
  }

  async function googleLogin(idToken: string) {
    const data = await api<AuthResponse>('/auth/google', { method: 'POST', body: { idToken } });
    const next = toSession(data);
    saveSession(next);
    setSession(next);
  }

  async function logout() {
    const current = loadSession();
    try {
      if (current) {
        await api('/auth/logout', { method: 'POST', body: { refreshToken: current.refreshToken } });
      }
    } catch {
      // ignora fallos de red al salir
    }
    clearSession();
    setSession(null);
    notify(null);
  }

  return <AuthContext.Provider value={{ session, login, register, googleLogin, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return value;
}