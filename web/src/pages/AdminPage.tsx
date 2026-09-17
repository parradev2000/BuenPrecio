import { useState } from 'react';
import type { ReactNode } from 'react';
import { AdminBusinessesSection } from './admin/AdminBusinessesSection';
import { AdminCategoriesSection } from './admin/AdminCategoriesSection';
import { AdminUsersSection } from './admin/AdminUsersSection';
import { ApplicationsSection } from './admin/ApplicationsSection';

type TabKey = 'aplicaciones' | 'usuarios' | 'categorias' | 'negocios';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'aplicaciones', label: 'Solicitudes' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'categorias', label: 'Tipos de negocio' },
  { key: 'negocios', label: 'Negocios' },
];

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>('aplicaciones');

  const content: Record<TabKey, ReactNode> = {
    aplicaciones: <ApplicationsSection />,
    usuarios: <AdminUsersSection />,
    categorias: <AdminCategoriesSection />,
    negocios: <AdminBusinessesSection />,
  };

  return (
    <div className="page">
      <h1>Administración</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`chip tab${tab === t.key ? ' tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {content[tab]}
    </div>
  );
}