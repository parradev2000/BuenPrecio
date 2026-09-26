import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { App, Button, Modal, Popconfirm, Table, Tag, type TableProps } from 'antd';
import { api } from '../../api/client';
import type { Category, CategoryKind } from '../../api/types';
import { Alert, Field } from '../../components/ui';

export function AdminCategoriesSection() {
  const { message } = App.useApp();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', kind: 'negocio' as CategoryKind });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [modalBusy, setModalBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: Category[] }>('/categories');
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api('/categories', { method: 'POST', body: form, auth: true });
      setForm({ name: '', kind: 'negocio' });
      message.success('Tipo de negocio creado');
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setModalBusy(true);
    setError(null);
    try {
      await api(`/categories/${editing.id}`, { method: 'PATCH', body: { name: editName.trim() }, auth: true });
      setEditing(null);
      message.success('Tipo de negocio actualizado');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setModalBusy(false);
    }
  }

  async function remove(category: Category) {
    setError(null);
    try {
      await api(`/categories/${category.id}`, { method: 'DELETE', auth: true });
      message.success('Tipo de negocio eliminado');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  const columns: TableProps<Category>['columns'] = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (_, c) => (
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15 text-sm font-semibold text-brand-700 dark:text-brand-400">
            {c.name[0]?.toUpperCase() ?? 'N'}
          </span>
          <span className="flex flex-col gap-1">
            <strong className="font-medium text-slate-900">{c.name}</strong>
            <Tag color="green" className="w-fit">
              {c.kind === 'negocio' ? 'Negocio' : 'Producto'}
            </Tag>
          </span>
        </span>
      ),
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      responsive: ['sm'],
      render: (value: string) => (
        <span className="text-slate-500">{new Date(value).toLocaleDateString('es-CU')}</span>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, c) => (
        <div className="flex gap-2">
          <Button
            size="small"
            onClick={() => {
              setEditing(c);
              setEditName(c.name);
            }}
          >
            Editar
          </Button>
          <Popconfirm
            title="Eliminar tipo de negocio"
            description={`¿Eliminar "${c.name}"?`}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => void remove(c)}
          >
            <Button size="small" danger>
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
        <h2 className="text-lg font-semibold text-slate-900">Tipos de negocio</h2>
        <Tag>
          {items.length} {items.length === 1 ? 'tipo' : 'tipos'}
        </Tag>
      </div>

      <form onSubmit={create} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            label="Nuevo tipo de negocio *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <Button
          type="primary"
          htmlType="submit"
          loading={busy}
          disabled={!form.name.trim()}
          className="mb-3"
        >
          Crear tipo de negocio
        </Button>
      </form>

      {formError && <Alert kind="error">{formError}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <Table<Category>
        className="mt-2"
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />

      <Modal
        open={editing != null}
        title="Editar tipo de negocio"
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={modalBusy}
        okButtonProps={{ disabled: !editName.trim() }}
        onOk={() => void saveEdit()}
        onCancel={() => setEditing(null)}
      >
        <Field
          label="Nombre *"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          maxLength={100}
          autoFocus
        />
      </Modal>
    </section>
  );
}
