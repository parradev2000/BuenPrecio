import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { ProductCategory } from '../../api/types';
import { Alert, EmptyState, Field, Loading } from '../../components/ui';

export function AdminProductCategoriesSection() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: ProductCategory) {
    if (!window.confirm(`¿Eliminar la categoría de producto "${category.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await api(`/product-categories/${category.id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <section>
      <form onSubmit={create} className="form card">
        <h2>Nueva categoría de producto</h2>
        {formError && <Alert kind="error">{formError}</Alert>}
        <Field label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Ej. Frutas y Verduras" />
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Creando…' : 'Crear categoría de producto'}
        </button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay categorías de producto creadas." />}
      <ul className="item-list">
        {items.map((c) => (
          <li key={c.id} className="item-row">
            <div>
              <strong>{c.name}</strong>
              <p className="muted">Creada el {new Date(c.createdAt).toLocaleDateString('es-CU')}</p>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(c)}>
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}