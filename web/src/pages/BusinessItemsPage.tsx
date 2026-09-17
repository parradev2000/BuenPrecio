import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Business, BusinessItem, ItemType, ProductCategory } from '../api/types';
import { formatPrice } from '../lib/format';
import { Alert, EmptyState, Field, Loading } from '../components/ui';

const ITEM_UNITS = ['unidad', 'kg', 'litro', 'paquete'] as const;

type ItemForm = {
  type: ItemType;
  name: string;
  description: string;
  price: string;
  unit: string;
  photoUrl: string;
  categoryId: string;
};

const INITIAL: ItemForm = {
  type: 'producto',
  name: '',
  description: '',
  price: '',
  unit: 'unidad',
  photoUrl: '',
  categoryId: '',
};

export function BusinessItemsPage() {
  const { id } = useParams<{ id: string }>();
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
      if (!form.categoryId) {
        setFormError('Selecciona una categoría');
        return;
      }
      const body: Record<string, unknown> = { name: form.name, type: form.type, price, categoryId: form.categoryId };
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
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar el producto');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: BusinessItem) {
    setEditing(item);
    setForm({
      type: item.type,
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      unit: item.unit ?? 'unidad',
      photoUrl: item.photoUrl ?? '',
      categoryId: item.categoryId ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(INITIAL);
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError('El archivo es demasiado grande (máximo 5 MB)');
      event.target.value = '';
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
      event.target.value = '';
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
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) {
      return;
    }
    await api(`/items/${item.id}`, { method: 'DELETE', auth: true });
    await load();
  }

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <p className="alert alert-error">{error}</p>;
  }
  if (!business) {
    return <EmptyState message="Negocio no encontrado." />;
  }

  return (
    <div className="page">
      <Link to="/mis-negocios" className="back-link">
        ← Volver a mis negocios
      </Link>
      <h1>{business.name}</h1>
      <p className="muted">{business.active ? 'Activo' : 'Desactivado'} · {items.length} producto{items.length === 1 ? '' : 's'}</p>

      <form onSubmit={addItem} className="form card">
        <div className="form-header">
          <h2>{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
          {editing && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
              Cancelar edición
            </button>
          )}
        </div>
        {formError && <Alert kind="error">{formError}</Alert>}
        <div className="form-row">
          <label className="field">
            <span className="field-label">Tipo</span>
            <select className="field-input" value={form.type} onChange={(e) => setFormField('type', e.target.value)}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </select>
          </label>
          {form.type === 'producto' && (
            <label className="field">
              <span className="field-label">Unidad</span>
              <select className="field-input" value={form.unit} onChange={(e) => setFormField('unit', e.target.value)}>
                {ITEM_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <Field label="Nombre *" value={form.name} onChange={(e) => setFormField('name', e.target.value)} maxLength={200} placeholder="Ej. Café con leche" />
        <label className="field">
            <span className="field-label">Categoría *</span>
            <select
              className="field-input"
              value={form.categoryId}
              onChange={(e) => setFormField('categoryId', e.target.value)}
            >
              <option value="">Selecciona una categoría…</option>
              {productCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        <Field label="Descripción" value={form.description} onChange={(e) => setFormField('description', e.target.value)} maxLength={500} />
        <label className="field">
            <span className="field-label">Foto del producto</span>
            <input
              className="field-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => void onPhotoChange(e)}
            />
            {photoUploading && <span className="field-error">Subiendo foto…</span>}
          </label>
          {!photoUploading && form.photoUrl && (
            <div className="item-photo-content">
              <img src={form.photoUrl} alt="" className="item-thumb" decoding="async" />
              <span className="muted">Foto cargada</span>
            </div>
          )}
        <Field label="Precio (CUP) *" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setFormField('price', e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim() || !form.price || !form.categoryId}>
          {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar producto'}
        </button>
      </form>

      <h2 className="section-title">Catálogo actual</h2>
      {items.length === 0 && (
        <EmptyState
          message="Este negocio todavía no tiene productos."
          action={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                cancelEdit();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Agregar primer producto
            </button>
          }
        />
      )}
      <ul className="item-list">
        {items.map((item) => (
          <li key={item.id} className={`item-row${item.available ? '' : ' item-off'}`}>
            <div className={item.photoUrl ? 'item-photo-content' : undefined}>
              {item.photoUrl && (
                <img src={item.photoUrl} alt="" className="item-thumb" loading="lazy" decoding="async" />
              )}
              <div>
                <div className="item-name">
                  {item.name}{' '}
                  <span className="chip">
                    {item.type === 'producto' ? item.unit ?? 'unidad' : 'servicio'}
                  </span>
                  {!item.available && <span className="chip chip-off">oculto</span>}
                </div>
                {item.description && <p className="muted">{item.description}</p>}
              </div>
            </div>
            <div className="item-row-actions">
              <span className="item-price">{formatPrice(item.price)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>
                Editar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggleAvailable(item)}>
                {item.available ? 'Ocultar' : 'Mostrar'}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => void removeItem(item)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}