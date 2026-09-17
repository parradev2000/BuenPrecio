import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '@buenprecio/shared';
import { zodError } from '../lib/zodError';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Alert, Field } from '../components/ui';
import { useSeo } from '../hooks/useSeo';

export function LoginPage() {
  useSeo({
    title: 'Entrar - Buen Precio',
    description: 'Inicia sesión en Buen Precio para gestionar tus negocios y catálogos.',
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(zodError(parsed.error));
      return;
    }
    setErrors({});
    setApiError(null);
    setBusy(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate('/');
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Entrar</h1>
      {apiError && <Alert kind="error">{apiError}</Alert>}
      <form onSubmit={onSubmit} className="form">
        <Field
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          error={errors.email}
        />
        <Field
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="muted">
        ¿No tienes cuenta? <Link to="/registro">Crea una gratis</Link>
      </p>
    </div>
  );
}