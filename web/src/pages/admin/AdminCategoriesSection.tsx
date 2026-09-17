import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { Category, CategoryKind } from '../../api/types';
import { Alert, EmptyState, Field, Loading } from '../../components/ui';

export function AdminCategoriesSection() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', kind: 'negocio' as CategoryKind });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`¿Eliminar el tipo de negocio "${category.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await api(`/categories/${category.id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <section>
      <form onSubmit={create} className="form card">
        <h2>Nuevo tipo de negocio</h2>
        {formError && <Alert kind="error">{formError}</Alert>}
        <div className="form-row">
          <Field label="Nombre *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <label className="field">
            <span className="field-label">Tipo</span>
            <select className="field-input" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CategoryKind }))}>
              <option value="negocio">Negocio</option>
              <option value="item">Producto</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim()}>
          {busy ? 'Creando…' : 'Crear tipo de negocio'}
        </button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay tipos de negocio creados." />}
      <ul className="item-list">
        {items.map((c) => (
          <li key={c.id} className="item-row">
            <div>
              <strong>{c.name}</strong> <span className="chip">{c.kind === 'negocio' ? 'Negocio' : 'Producto'}</span>
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