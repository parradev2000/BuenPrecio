import { useCallback, useEffect, useState } from 'react';
import { Button, Segmented, Table, Tag, type TableProps } from 'antd';
import { api } from '../../api/client';
import type { AdminApplicationRow, ApplicationStatus } from '../../api/types';
import { Alert } from '../../components/ui';

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function ApplicationsSection({ onReviewed }: { onReviewed?: () => void }) {
  const [items, setItems] = useState<AdminApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: ApplicationStatus) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: AdminApplicationRow[] }>(`/admin/applications?status=${status}`, { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/applications/${id}/${action}`, { method: 'POST', auth: true });
      await load(filter);
      onReviewed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar');
    } finally {
      setBusy(false);
    }
  }

  const columns: TableProps<AdminApplicationRow>['columns'] = [
    {
      title: 'Solicitante',
      key: 'user',
      render: (_, a) => (
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15 text-sm font-semibold text-brand-700 dark:text-brand-400">
            {initials(a.userName)}
          </span>
          <span className="flex flex-col">
            <strong className="font-medium text-slate-900">{a.userName}</strong>
            <span className="text-xs text-slate-500">{a.userEmail}</span>
          </span>
        </span>
      ),
    },
    {
      title: 'Solicitada',
      dataIndex: 'createdAt',
      render: (value: string) => (
        <span className="text-slate-500">{new Date(value).toLocaleDateString('es-CU')}</span>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      responsive: ['sm'],
      render: (_, a) => <Tag color={STATUS_COLOR[a.status]}>{STATUS_LABEL[a.status]}</Tag>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, a) =>
        filter === 'pending' ? (
          <div className="flex gap-2">
            <Button type="primary" size="small" disabled={busy} onClick={() => void review(a.id, 'approve')}>
              Aprobar
            </Button>
            <Button danger size="small" disabled={busy} onClick={() => void review(a.id, 'reject')}>
              Rechazar
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Solicitudes de productor</h2>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          options={[
            { label: 'Pendientes', value: 'pending' },
            { label: 'Aprobadas', value: 'approved' },
            { label: 'Rechazadas', value: 'rejected' },
          ]}
        />
      </div>

      {error && (
        <div className="mt-3">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Table<AdminApplicationRow>
        className="mt-3"
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: 'No hay solicitudes aquí.' }}
      />
    </section>
  );
}
