import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '@buenprecio/shared';
import { zodError } from '../lib/zodError';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Alert, Field } from '../components/ui';

export function RegisterPage() {
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
    <div className="auth-page">
      <h1>Crear cuenta</h1>
      {apiError && <Alert kind="error">{apiError}</Alert>}
      <form onSubmit={onSubmit} className="form">
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
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/entrar">Entra aquí</Link>
      </p>
    </div>
  );
}