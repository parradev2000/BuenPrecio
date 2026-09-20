import { useEffect, useMemo, useState } from 'react';
import { App, Button, Input, Select, Table, Tag, type TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import type { AdminBusiness } from '../../api/types';
import { Alert } from '../../components/ui';

export function AdminBusinessesSection() {
  const { modal, message } = App.useApp();
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: AdminBusiness[] }>('/admin/businesses', { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }

  async function doToggle(business: AdminBusiness) {
    setError(null);
    try {
      await api(`/businesses/${business.id}`, {
        method: 'PATCH',
        body: { active: !business.active },
        auth: true,
      });
      message.success('Negocio actualizado');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  }

  function toggle(business: AdminBusiness) {
    if (!business.active) {
      void doToggle(business);
      return;
    }
    modal.confirm({
      title: 'Desactivar negocio',
      content: `¿Desactivar "${business.name}"? Dejará de verse en el catálogo.`,
      okText: 'Desactivar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => doToggle(business),
    });
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((b) => {
      if (query) {
        const haystack = `${b.name} ${b.ownerName} ${b.ownerEmail}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (status === 'active' && !b.active) return false;
      if (status === 'inactive' && b.active) return false;
      return true;
    });
  }, [items, search, status]);

  const columns: TableProps<AdminBusiness>['columns'] = [
    {
      title: 'Negocio',
      dataIndex: 'name',
      render: (_, b) => (
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
            {b.name[0]?.toUpperCase() ?? 'N'}
          </span>
          <strong className="font-medium text-slate-900">{b.name}</strong>
        </span>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, b) => <Tag color={b.active ? 'green' : 'default'}>{b.active ? 'Activo' : 'Inactivo'}</Tag>,
    },
    { title: 'Dueño', dataIndex: 'ownerName', responsive: ['lg'] },
    {
      title: 'Correo',
      dataIndex: 'ownerEmail',
      responsive: ['lg'],
      render: (value: string) => <span className="text-slate-500">{value}</span>,
    },
    {
      title: 'Ubicación',
      dataIndex: 'address',
      responsive: ['xl'],
      render: (value: string | null) => <span className="text-slate-500">{value ?? '—'}</span>,
    },
    { title: 'Productos', dataIndex: 'itemsCount', responsive: ['sm'] },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, b) => (
        <Button size="small" type="text" onClick={() => toggle(b)}>
          {b.active ? 'Desactivar' : 'Activar'}
        </Button>
      ),
    },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Negocios</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            allowClear
            placeholder="Buscar por nombre o dueño…"
            prefix={<SearchOutlined className="text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value)}
            className="sm:w-44"
            options={[
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Table<AdminBusiness>
        className="mt-3"
        rowKey="id"
        loading={loading}
        dataSource={visible}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: 'No hay negocios que coincidan.' }}
      />
    </section>
  );
}
