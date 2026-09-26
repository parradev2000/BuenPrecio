import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'antd';
import { resetPasswordSchema } from '@buenprecio/shared';
import { zodError } from '../lib/zodError';
import { api, ApiError } from '../api/client';
import { Alert, Field } from '../components/ui';
import { useSeo } from '../hooks/useSeo';

export function ResetPasswordPage() {
  useSeo({
    title: 'Restablecer contraseña - Buen Precio',
    description: 'Elige una nueva contraseña para tu cuenta de Buen Precio.',
  });
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setErrors(zodError(parsed.error));
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: 'Las contraseñas no coinciden' });
      return;
    }
    setErrors({});
    setApiError(null);
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: parsed.data });
      navigate('/entrar', { replace: true });
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Nueva contraseña</h1>
        {apiError && (
          <div className="mt-4">
            <Alert kind="error">{apiError}</Alert>
          </div>
        )}
        {!token ? (
          <div className="mt-4">
            <Alert kind="error">El enlace de restablecimiento no es válido o ha expirado.</Alert>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4">
            <Field
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              error={errors.password}
            />
            <Field
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              error={errors.confirm}
            />
            <Button type="primary" htmlType="submit" block loading={busy} className="mt-2">
              Guardar contraseña
            </Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/entrar" className="font-medium text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300">
            Volver a entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
