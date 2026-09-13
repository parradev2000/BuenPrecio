import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/entrar" replace />;
  }
  return children;
}

export function RequireRole({ role, children }: { role: 'productor' | 'administrador'; children: ReactNode }) {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/entrar" replace />;
  }
  if (session.user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session) {
    return <Navigate to="/" replace />;
  }
  return children;
}