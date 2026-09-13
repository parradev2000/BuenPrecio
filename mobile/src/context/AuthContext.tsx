import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse } from '@buenprecio/shared';
import { api } from '../api/client';
import { clearSession, loadSession, saveSession, type Session } from '../api/session';

function toSession(data: AuthResponse): Session {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
}

type AuthContextValue = {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void loadSession().then(setSession);
  }, []);

  async function login(email: string, password: string) {
    const data = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
    const next = toSession(data);
    await saveSession(next);
    setSession(next);
  }

  async function register(name: string, email: string, password: string) {
    const data = await api<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } });
    const next = toSession(data);
    await saveSession(next);
    setSession(next);
  }

  async function logout() {
    try {
      if (session) {
        await api('/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken } });
      }
    } catch {
      // ignora
    }
    await clearSession();
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return value;
}