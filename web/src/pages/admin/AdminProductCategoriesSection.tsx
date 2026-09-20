import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { App, Button, Modal, Popconfirm, Table, Tag, type TableProps } from 'antd';
import { api } from '../../api/client';
import type { ProductCategory } from '../../api/types';
import { Alert, Field } from '../../components/ui';

export function AdminProductCategoriesSection() {
  const { message } = App.useApp();
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [modalBusy, setModalBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: ProductCategory[] }>('/product-categories');
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
      await api('/product-categories', { method: 'POST', body: { name: name.trim() }, auth: true });
      setName('');
      message.success('Categoría de producto creada');
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
      await api(`/product-categories/${editing.id}`, { method: 'PATCH', body: { name: editName.trim() }, auth: true });
      setEditing(null);
      message.success('Categoría de producto actualizada');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setModalBusy(false);
    }
  }

  async function remove(category: ProductCategory) {
    setError(null);
    try {
      await api(`/product-categories/${category.id}`, { method: 'DELETE', auth: true });
      message.success('Categoría de producto eliminada');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  const columns: TableProps<ProductCategory>['columns'] = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (_, c) => (
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {c.name[0]?.toUpperCase() ?? 'N'}
          </span>
          <span className="flex flex-col gap-1">
            <strong className="font-medium text-slate-900">{c.name}</strong>
            <Tag className="w-fit">Producto</Tag>
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
            title="Eliminar categoría de producto"
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
        <h2 className="text-lg font-semibold text-slate-900">Categorías de producto</h2>
        <Tag>
          {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
        </Tag>
      </div>

      <form onSubmit={create} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            label="Nueva categoría *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Ej. Frutas y Verduras"
          />
        </div>
        <Button
          type="primary"
          htmlType="submit"
          loading={busy}
          disabled={!name.trim()}
          className="mb-3"
        >
          Crear categoría de producto
        </Button>
      </form>

      {formError && <Alert kind="error">{formError}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <Table<ProductCategory>
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
        title="Editar categoría de producto"
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
