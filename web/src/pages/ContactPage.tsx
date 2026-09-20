import type { ReactNode } from 'react';
import { MailOutlined, PhoneOutlined } from '@ant-design/icons';

const DEV = {
  name: 'Álvaro Parra',
  handle: '@ParraDEV',
  email: 'alvaroparra233@gmail.com',
  phone: '+53 58239510',
  phoneHref: 'tel:+5358239510',
  role: 'Desarrollador y dueño de la aplicación',
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{children}</span>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Contáctanos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Aquí puedes encontrar la información del desarrollador de Buen Precio.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Desarrollador</h2>
        <div className="mt-2 divide-y divide-slate-100">
          <InfoRow label="Nombre">
            <strong className="font-semibold">{DEV.name}</strong>
          </InfoRow>
          <InfoRow label="Rol">
            <span className="inline-flex items-center gap-2">
              {DEV.role}
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                {DEV.handle}
              </span>
            </span>
          </InfoRow>
          <InfoRow label="Correo">
            <a
              className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800"
              href={`mailto:${DEV.email}`}
            >
              <MailOutlined /> {DEV.email}
            </a>
          </InfoRow>
          <InfoRow label="Teléfono">
            <a
              className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800"
              href={DEV.phoneHref}
            >
              <PhoneOutlined /> {DEV.phone}
            </a>
          </InfoRow>
        </div>
      </section>

      <p className="text-sm text-slate-500">
        Ante cualquier duda, sugerencia o reporte, escríbenos por correo o teléfono.
      </p>
    </div>
  );
}
