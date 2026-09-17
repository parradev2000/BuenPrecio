import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { AdminApplicationRow } from '../api/types';
import { AdminBusinessesSection } from './admin/AdminBusinessesSection';
import { AdminCategoriesSection } from './admin/AdminCategoriesSection';
import { AdminProductCategoriesSection } from './admin/AdminProductCategoriesSection';
import { AdminUsersSection } from './admin/AdminUsersSection';
import { ApplicationsSection } from './admin/ApplicationsSection';

type TabKey = 'aplicaciones' | 'usuarios' | 'categorias' | 'productos-categorias' | 'negocios';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'aplicaciones', label: 'Solicitudes' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'categorias', label: 'Tipos de negocio' },
  { key: 'productos-categorias', label: 'Categorías de producto' },
  { key: 'negocios', label: 'Negocios' },
];

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>('aplicaciones');
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    try {
      const res = await api<{ items: AdminApplicationRow[] }>('/admin/applications?status=pending', { auth: true });
      setPendingCount(res.items.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  const content: Record<TabKey, ReactNode> = {
    aplicaciones: <ApplicationsSection onReviewed={() => void refreshPending()} />,
    usuarios: <AdminUsersSection />,
    categorias: <AdminCategoriesSection />,
    'productos-categorias': <AdminProductCategoriesSection />,
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
            {t.key === 'aplicaciones' && pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
          </button>
        ))}
      </div>
      {content[tab]}
    </div>
  );
}