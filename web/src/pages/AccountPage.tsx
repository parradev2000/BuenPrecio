import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Application } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { Alert, Field, Loading } from '../components/ui';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export function AccountPage() {
  const { session } = useAuth();
  const [application, setApplication] = useState<Application | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const roleLabel =
    session?.user.role === 'consumidor' ? 'Consumidor'
    : session?.user.role === 'productor' ? 'Productor'
    : session?.user.role === 'administrador' ? 'Administrador'
    : '';

  useEffect(() => {
    if (session?.user.role === 'consumidor') {
      void loadApplication();
    }
  }, [session?.user.role]);

  async function loadApplication() {
    setError(null);
    try {
      const res = await api<{ application: Application | null }>('/me/producer-application', { auth: true });
      setApplication(res.application);
    } catch (e) {
      setApplication(null);
      setError(e instanceof Error ? e.message : 'No se pudo cargar tu solicitud');
    }
  }

  async function requestProducer() {
    setBusy(true);
    setError(null);
    try {
      await api('/me/producer-application', { method: 'POST', auth: true });
      await loadApplication();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setPwBusy(true);
    setPwError(null);
    setPwMessage(null);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        auth: true,
        body: { currentPassword: pwCurrent, newPassword: pwNew },
      });
      setPwMessage('Contraseña actualizada. Si estabas en otro dispositivo, tendrás que volver a entrar.');
      setPwCurrent('');
      setPwNew('');
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Mi cuenta</h1>
      {session && (
        <div className="profile">
          <p>
            <strong>{session.user.name}</strong> · {session.user.email}
          </p>
          <p>
            Rol: <span className="chip">{roleLabel}</span>
          </p>
        </div>
      )}

      {roleLabel === 'Consumidor' && (
        <section className="card">
          <h2>Ser productor</h2>
          <p>
            Como productor podrás publicar y gestionar tus negocios y su catálogo de productos y
            servicios. Envía una solicitud y un administrador la revisará.
          </p>
          {error && <Alert kind="error">{error}</Alert>}
          {application === undefined && <Loading />}
          {application === null && (
            <button type="button" className="btn btn-primary" onClick={() => void requestProducer()} disabled={busy}>
              {busy ? 'Enviando…' : 'Solicitar ser productor'}
            </button>
          )}
          {application !== null && application !== undefined && (
            <>
              <p>
                Estado: <span className="chip">{STATUS_LABEL[application.status]}</span>
              </p>
              {application.status === 'rejected' && (
                <button type="button" className="btn btn-primary" onClick={() => void requestProducer()} disabled={busy}>
                  {busy ? 'Enviando…' : 'Volver a solicitar'}
                </button>
              )}
              {application.status === 'approved' && (
                <p className="muted">Ya eres productor. Ve a <Link to="/mis-negocios">Mis negocios</Link>.</p>
              )}
            </>
          )}
        </section>
      )}

      {roleLabel === 'Productor' && (
        <p>
          Gestiona tus negocios en <Link to="/mis-negocios">Mis negocios</Link>.
        </p>
      )}

      {roleLabel === 'Administrador' && (
        <p>
          Administra la plataforma en <Link to="/admin">Administración</Link>.
        </p>
      )}

      <section className="card">
        <h2>Cambiar contraseña</h2>
        {pwMessage && <Alert kind="success">{pwMessage}</Alert>}
        {pwError && <Alert kind="error">{pwError}</Alert>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void changePassword();
          }}
        >
          <Field
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            required
          />
          <Field
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={pwBusy}>
            {pwBusy ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
}