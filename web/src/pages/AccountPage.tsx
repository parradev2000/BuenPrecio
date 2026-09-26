import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tag } from 'antd';
import { api } from '../api/client';
import type { Application } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { Alert, Field, Loading } from '../components/ui';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

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
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mi cuenta</h1>

      {session && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-lg font-semibold text-slate-900">{session.user.name}</p>
          <p className="text-sm text-slate-500">{session.user.email}</p>
          <p className="mt-3 text-sm text-slate-600">
            Rol: <Tag color="green">{roleLabel}</Tag>
          </p>
        </div>
      )}

      {roleLabel === 'Consumidor' && (
        <SectionCard title="Ser productor">
          <p className="text-sm text-slate-600">
            Como productor podrás publicar y gestionar tus negocios y su catálogo de productos y
            servicios. Envía una solicitud y un administrador la revisará.
          </p>
          <div className="mt-3">
            {error && <Alert kind="error">{error}</Alert>}
            {application === undefined && <Loading />}
            {application === null && (
              <Button type="primary" loading={busy} onClick={() => void requestProducer()}>
                Solicitar ser productor
              </Button>
            )}
            {application !== null && application !== undefined && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Estado: <Tag>{STATUS_LABEL[application.status]}</Tag>
                </p>
                {application.status === 'rejected' && (
                  <Button type="primary" loading={busy} onClick={() => void requestProducer()}>
                    Volver a solicitar
                  </Button>
                )}
                {application.status === 'approved' && (
                  <p className="text-sm text-slate-500">
                    Ya eres productor. Ve a{' '}
                    <Link to="/mis-negocios" className="font-medium text-brand-700 dark:text-brand-400">
                      Mis negocios
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {roleLabel === 'Productor' && (
        <p className="text-sm text-slate-600">
          Gestiona tus negocios en{' '}
          <Link to="/mis-negocios" className="font-medium text-brand-700 dark:text-brand-400">
            Mis negocios
          </Link>
          .
        </p>
      )}

      {roleLabel === 'Administrador' && (
        <p className="text-sm text-slate-600">
          Administra la plataforma en{' '}
          <Link to="/admin" className="font-medium text-brand-700 dark:text-brand-400">
            Administración
          </Link>
          .
        </p>
      )}

      <SectionCard title="Cambiar contraseña">
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
          <Button type="primary" htmlType="submit" loading={pwBusy} className="mt-2">
            Actualizar contraseña
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
