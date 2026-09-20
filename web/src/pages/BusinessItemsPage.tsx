import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { App, Button, Popconfirm, Select, Tag, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { Business, BusinessItem, ItemType, ProductCategory } from '../api/types';
import { formatPrice } from '../lib/format';
import { Alert, EmptyState, Field, Loading } from '../components/ui';

const ITEM_UNITS = ['unidad', 'kg', 'litro', 'paquete'] as const;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

type ItemForm = {
  type: ItemType;
  name: string;
  description: string;
  price: string;
  unit: string;
  photoUrl: string;
  categoryId: string;
  newCategoryName: string;
};

const INITIAL: ItemForm = {
  type: 'producto',
  name: '',
  description: '',
  price: '',
  unit: 'unidad',
  photoUrl: '',
  categoryId: '',
  newCategoryName: '',
};

export function BusinessItemsPage() {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [business, setBusiness] = useState<Business | null>(null);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<ItemForm>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BusinessItem | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newCategory, setNewCategory] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [res, cats] = await Promise.all([
        api<{ business: Business & { items: BusinessItem[] } }>(`/businesses/${id}`, { auth: true }),
        api<{ items: ProductCategory[] }>('/product-categories'),
      ]);
      setBusiness(res.business);
      setItems(res.business.items ?? []);
      setProductCategories(cats.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }

  function setFormField(key: keyof ItemForm, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'type' && value === 'servicio') {
        next.unit = '';
      }
      return next;
    });
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const price = Number(form.price);
      if (!Number.isFinite(price) || price <= 0) {
        setFormError('Escribe un precio mayor a 0');
        return;
      }
      if (!form.categoryId && !(newCategory && form.newCategoryName.trim())) {
        setFormError('Selecciona una categoría o crea una nueva');
        return;
      }
      const body: Record<string, unknown> = { name: form.name, type: form.type, price };
      if (newCategory && form.newCategoryName.trim()) body.newCategoryName = form.newCategoryName.trim();
      else body.categoryId = form.categoryId;
      if (form.description) body.description = form.description;
      else if (editing) body.description = null;
      if (form.type === 'producto') body.unit = form.unit || 'unidad';
      else body.unit = null;
      if (form.photoUrl.trim()) body.photoUrl = form.photoUrl.trim();
      else if (editing) body.photoUrl = null;
      if (editing) {
        await api(`/items/${editing.id}`, { method: 'PATCH', body, auth: true });
      } else {
        await api(`/businesses/${id}/items`, { method: 'POST', body, auth: true });
      }
      setForm(INITIAL);
      setEditing(null);
      setNewCategory(false);
      message.success(editing ? 'Producto actualizado' : 'Producto agregado');
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar el producto');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: BusinessItem) {
    setEditing(item);
    setNewCategory(false);
    setForm({
      type: item.type,
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      unit: item.unit ?? 'unidad',
      photoUrl: item.photoUrl ?? '',
      categoryId: item.categoryId ?? '',
      newCategoryName: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setNewCategory(false);
    setForm(INITIAL);
  }

  async function uploadPhoto(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setFormError('El archivo es demasiado grande (máximo 5 MB)');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    setPhotoUploading(true);
    setFormError(null);
    try {
      const res = await api<{ url: string }>('/uploads', { method: 'POST', body, auth: true });
      setFormField('photoUrl', res.url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function toggleAvailable(item: BusinessItem) {
    await api(`/items/${item.id}`, {
      method: 'PATCH',
      body: { available: !item.available },
      auth: true,
    });
    await load();
  }

  async function removeItem(item: BusinessItem) {
    await api(`/items/${item.id}`, { method: 'DELETE', auth: true });
    message.success('Producto eliminado');
    await load();
  }

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!business) {
    return <EmptyState message="Negocio no encontrado." />;
  }

  return (
    <div>
      <Link to="/mis-negocios" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Volver a mis negocios
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{business.name}</h1>
        <Tag color={business.active ? 'green' : 'default'}>
          {business.active ? 'Activo' : 'Desactivado'}
        </Tag>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {items.length} producto{items.length === 1 ? '' : 's'}
      </p>

      <form
        onSubmit={addItem}
        className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          {editing && (
            <Button size="small" onClick={cancelEdit}>
              Cancelar edición
            </Button>
          )}
        </div>

        <div className="mt-4">
          {formError && <Alert kind="error">{formError}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Tipo</span>
              <Select
                className="w-full"
                value={form.type}
                onChange={(v) => setFormField('type', v)}
                options={[
                  { value: 'producto', label: 'Producto' },
                  { value: 'servicio', label: 'Servicio' },
                ]}
              />
            </label>
            {form.type === 'producto' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Unidad</span>
                <Select
                  className="w-full"
                  value={form.unit}
                  onChange={(v) => setFormField('unit', v)}
                  options={ITEM_UNITS.map((u) => ({ value: u, label: u }))}
                />
              </label>
            )}
          </div>

          <Field
            label="Nombre *"
            value={form.name}
            onChange={(e) => setFormField('name', e.target.value)}
            maxLength={200}
            placeholder="Ej. Café con leche"
          />

          {newCategory ? (
            <div>
              <Field
                label="Nueva categoría *"
                value={form.newCategoryName}
                onChange={(e) => setFormField('newCategoryName', e.target.value)}
                maxLength={60}
                placeholder="Ej. Panadería"
              />
              <Button
                size="small"
                className="mb-3"
                onClick={() => {
                  setNewCategory(false);
                  setFormField('newCategoryName', '');
                }}
              >
                Elegir una categoría existente
              </Button>
            </div>
          ) : (
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Categoría *</span>
              <Select
                className="w-full"
                value={form.categoryId || undefined}
                placeholder="Selecciona una categoría…"
                onChange={(v) => {
                  if (v === '__new__') {
                    setNewCategory(true);
                    setFormField('categoryId', '');
                  } else {
                    setFormField('categoryId', v ?? '');
                  }
                }}
                options={[
                  ...productCategories.map((c) => ({ value: c.id, label: c.name })),
                  { value: '__new__', label: '+ Crear nueva categoría…' },
                ]}
              />
            </label>
          )}

          <Field
            label="Descripción"
            value={form.description}
            onChange={(e) => setFormField('description', e.target.value)}
            maxLength={500}
          />

          <div className="mb-3">
            <span className="mb-1 block text-sm font-medium text-slate-600">Foto del producto</span>
            <div className="flex flex-wrap items-center gap-3">
              <Upload
                accept={ACCEPTED}
                showUploadList={false}
                beforeUpload={(file) => {
                  void uploadPhoto(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} loading={photoUploading}>
                  {photoUploading ? 'Subiendo…' : 'Subir foto'}
                </Button>
              </Upload>
              {!photoUploading && form.photoUrl && (
                <img
                  src={form.photoUrl}
                  alt=""
                  decoding="async"
                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>
          </div>

          <Field
            label="Precio (CUP) *"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setFormField('price', e.target.value)}
          />

          <Button
            type="primary"
            htmlType="submit"
            loading={busy}
            disabled={
              !form.name.trim() ||
              !form.price ||
              (!form.categoryId && !(newCategory && form.newCategoryName.trim()))
            }
          >
            {editing ? 'Guardar cambios' : 'Agregar producto'}
          </Button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Catálogo actual</h2>
      {items.length === 0 && (
        <EmptyState
          message="Este negocio todavía no tiene productos."
          action={
            <Button
              type="primary"
              size="small"
              onClick={() => {
                cancelEdit();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Agregar primer producto
            </Button>
          }
        />
      )}
      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {item.photoUrl && (
                  <img
                    src={item.photoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                    {item.name}
                    <Tag>{item.type === 'producto' ? item.unit ?? 'unidad' : 'servicio'}</Tag>
                    {!item.available && <Tag color="default">oculto</Tag>}
                  </div>
                  {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="font-bold text-brand-700">{formatPrice(item.price)}</span>
                <Button size="small" onClick={() => startEdit(item)}>
                  Editar
                </Button>
                <Button size="small" type="text" onClick={() => void toggleAvailable(item)}>
                  {item.available ? 'Ocultar' : 'Mostrar'}
                </Button>
                <Popconfirm
                  title={`¿Eliminar "${item.name}"?`}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void removeItem(item)}
                >
                  <Button size="small" danger>
                    Eliminar
                  </Button>
                </Popconfirm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
