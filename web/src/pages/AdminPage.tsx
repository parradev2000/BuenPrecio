import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Tabs } from 'antd';
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
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Administración</h1>
      <p className="mt-1 text-sm text-slate-500">
        Usuarios, negocios, categorías y solicitudes de productores.
      </p>

      <Tabs
        className="mt-4"
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={TABS.map((t) => ({
          key: t.key,
          label: (
            <span className="inline-flex items-center gap-2">
              {t.label}
              {t.key === 'aplicaciones' && pendingCount > 0 && (
                <Badge count={pendingCount} size="small" color="#059669" />
              )}
            </span>
          ),
        }))}
      />

      <div className="mt-2">{content[tab]}</div>
    </div>
  );
}
