import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { registerSchema } from '@buenprecio/shared';
import { zodError } from '../lib/zodError';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Alert, Field } from '../components/ui';
import { useSeo } from '../hooks/useSeo';

export function RegisterPage() {
  useSeo({
    title: 'Crear cuenta - Buen Precio',
    description:
      'Crea tu cuenta gratuita en Buen Precio y publica tu negocio con su catálogo de productos y servicios.',
  });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodError(parsed.error));
      return;
    }
    setErrors({});
    setApiError(null);
    setBusy(true);
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.password);
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
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Crear cuenta</h1>
        {apiError && (
          <div className="mt-4">
            <Alert kind="error">{apiError}</Alert>
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-4">
          <Field
            label="Nombre"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Como te llamas"
            error={errors.name}
          />
          <Field
            label="Correo"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="tu@correo.com"
            error={errors.email}
          />
          <Field
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Mínimo 8 caracteres"
            error={errors.password}
          />
          <Button type="primary" htmlType="submit" block loading={busy} className="mt-2">
            Crear cuenta
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" className="font-medium text-brand-700 hover:text-brand-800">
            Entra aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
