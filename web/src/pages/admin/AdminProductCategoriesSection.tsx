import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { ProductCategory } from '../../api/types';
import { Alert, EmptyState, Field, Loading } from '../../components/ui';

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export function AdminProductCategoriesSection() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: ProductCategory[] }>('/product-categories');
      setItems(res.items);
    } catch (e) {
      setError(message(e, 'No se pudo cargar'));
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
      setFormError(message(e, 'No se pudo crear'));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(category: ProductCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) {
      return;
    }
    const target = items.find((c) => c.id === editingId);
    if (!target) {
      return;
    }
    const trimmed = editName.trim();
    if (!trimmed || trimmed === target.name) {
      cancelEdit();
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await api(`/product-categories/${editingId}`, { method: 'PATCH', body: { name: trimmed }, auth: true });
      cancelEdit();
      await load();
    } catch (e) {
      setEditError(message(e, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: ProductCategory) {
    if (!window.confirm(`¿Eliminar la categoría de producto "${category.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await api(`/product-categories/${category.id}`, { method: 'DELETE', auth: true });
      if (editingId === category.id) {
        cancelEdit();
      }
      await load();
    } catch (e) {
      setError(message(e, 'No se pudo eliminar'));
    }
  }

  return (
    <section>
      <form onSubmit={create} className="form card">
        <h2>Nueva categoría de producto</h2>
        {formError && <Alert kind="error">{formError}</Alert>}
        <Field
          label="Nombre *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Ej. Frutas y Verduras"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Creando…' : 'Crear categoría de producto'}
        </button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay categorías de producto creadas." />}
      <ul className="item-list">
        {items.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="item-row">
              <form onSubmit={saveEdit} className="form-row" style={{ flex: 1 }}>
                <Field
                  label="Nombre *"
                  value={editName}
                  maxLength={100}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="item-row-actions">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !editName.trim()}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={saving}>
                    Cancelar
                  </button>
                </div>
                {editError && <Alert kind="error">{editError}</Alert>}
              </form>
            </li>
          ) : (
            <li key={c.id} className="item-row">
              <div>
                <strong>{c.name}</strong>
                <p className="muted">Creada el {new Date(c.createdAt).toLocaleDateString('es-CU')}</p>
              </div>
              <div className="item-row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(c)}>
                  Editar
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(c)}>
                  Eliminar
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
