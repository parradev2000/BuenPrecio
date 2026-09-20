import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
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
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Entrar</h1>
        {apiError && (
          <div className="mt-4">
            <Alert kind="error">{apiError}</Alert>
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-4">
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
          <Button type="primary" htmlType="submit" block loading={busy} className="mt-2">
            Entrar
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-brand-700 hover:text-brand-800">
            Crea una gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
