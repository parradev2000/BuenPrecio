import { useCallback, useEffect, useState } from 'react';
import { App, Button, Input, Popconfirm, Select, Table, Tag, type TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ROLE_LABELS } from '@buenprecio/shared';
import { api } from '../../api/client';
import type { AdminUser, RoleName } from '../../api/types';
import { Alert } from '../../components/ui';

const ROLE_OPTIONS: RoleName[] = ['consumidor', 'productor', 'administrador'];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function AdminUsersSection() {
  const { message } = App.useApp();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      const res = await api<{ items: AdminUser[] }>(`/admin/users?${params.toString()}`, { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(user: AdminUser, patch: { status?: AdminUser['status']; role?: RoleName }) {
    setBusyId(user.id);
    setError(null);
    try {
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: patch, auth: true });
      message.success('Usuario actualizado');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      await api(`/admin/users/${user.id}`, { method: 'DELETE', auth: true });
      message.success('Usuario eliminado');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  }

  const columns: TableProps<AdminUser>['columns'] = [
    {
      title: 'Usuario',
      key: 'user',
      render: (_, u) => (
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15 text-sm font-semibold text-brand-700 dark:text-brand-400">
            {initials(u.name)}
          </span>
          <span className="flex flex-col">
            <strong className="font-medium text-slate-900">{u.name}</strong>
            <span className="text-xs text-slate-500">{u.email}</span>
          </span>
        </span>
      ),
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      responsive: ['sm'],
      render: (value: string) => (
        <span className="text-slate-500">{new Date(value).toLocaleDateString('es-CU')}</span>
      ),
    },
    {
      title: 'Rol',
      key: 'role',
      render: (_, u) => (
        <Select
          size="small"
          className="min-w-36"
          value={u.role}
          disabled={busyId === u.id}
          onChange={(value) => void change(u, { role: value })}
          options={ROLE_OPTIONS.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, u) => (
        <Tag color={u.status === 'active' ? 'green' : 'red'}>
          {u.status === 'active' ? 'Activo' : 'Suspendido'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, u) => (
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={busyId === u.id}
            onClick={() => void change(u, { status: u.status === 'active' ? 'suspended' : 'active' })}
          >
            {u.status === 'active' ? 'Suspender' : 'Activar'}
          </Button>
          <Popconfirm
            title="Eliminar usuario"
            description={`¿Eliminar a ${u.name}? Se borrarán sus negocios y productos.`}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => void remove(u)}
          >
            <Button size="small" danger disabled={busyId === u.id}>
              Eliminar
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            allowClear
            placeholder="Buscar por nombre…"
            prefix={<SearchOutlined className="text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          <Select
            value={role || undefined}
            placeholder="Todos los roles"
            allowClear
            onChange={(v) => setRole(v ?? '')}
            className="sm:w-44"
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Table<AdminUser>
        className="mt-3"
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: 'No hay usuarios que coincidan.' }}
      />
    </section>
  );
}
