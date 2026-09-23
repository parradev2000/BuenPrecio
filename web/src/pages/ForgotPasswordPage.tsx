import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { forgotPasswordSchema } from '@buenprecio/shared';
import { zodError } from '../lib/zodError';
import { api, ApiError } from '../api/client';
import { Alert, Field } from '../components/ui';
import { useSeo } from '../hooks/useSeo';

export function ForgotPasswordPage() {
  useSeo({
    title: 'Recuperar contraseña - Buen Precio',
    description: 'Solicita un enlace para restablecer tu contraseña de Buen Precio.',
  });
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(zodError(parsed.error));
      return;
    }
    setErrors({});
    setApiError(null);
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: parsed.data });
      setSent(true);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Recuperar contraseña</h1>
        {apiError && (
          <div className="mt-4">
            <Alert kind="error">{apiError}</Alert>
          </div>
        )}
        {sent ? (
          <div className="mt-4">
            <Alert kind="success">
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.
            </Alert>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4">
            <p className="mb-4 text-sm text-slate-500">
              Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
            </p>
            <Field
              label="Correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              error={errors.email}
            />
            <Button type="primary" htmlType="submit" block loading={busy} className="mt-2">
              Enviar enlace
            </Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/entrar" className="font-medium text-brand-700 hover:text-brand-800">
            Volver a entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
