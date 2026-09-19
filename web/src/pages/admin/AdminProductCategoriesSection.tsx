import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { ProductCategory } from '../../api/types';
import { Alert, EmptyState, Field, Loading, Pagination } from '../../components/ui';

const PAGE_SIZE = 10;

export function AdminProductCategoriesSection() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const start = (page - 1) * PAGE_SIZE;
  const paged = items.slice(start, start + PAGE_SIZE);

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

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/product-categories/${editing.id}`, { method: 'PATCH', body: { name: editName.trim() }, auth: true });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
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
    <section className="admin-card">
      <div className="admin-head">
        <h2>Categorías de producto</h2>
        <span className="badge badge-neutral">
          {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
        </span>
      </div>

      <form onSubmit={create} className="form">
        {formError && <Alert kind="error">{formError}</Alert>}
        <div className="form-row">
          <Field
            label="Nueva categoría *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Ej. Frutas y Verduras"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Creando…' : 'Crear categoría de producto'}
        </button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay categorías de producto creadas." />}

      {!loading && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="hide-sm">Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id}>
                  {editing?.id === c.id ? (
                    <>
                      <td data-label="Nombre">
                        <form id={`edit-${c.id}`} onSubmit={saveEdit}>
                          <Field
                            label="Nombre *"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={100}
                            autoFocus
                          />
                        </form>
                      </td>
                      <td className="hide-sm" data-label="Creada" />
                      <td data-label="Acciones">
                        <div className="item-row-actions">
                          <button type="submit" form={`edit-${c.id}`} className="btn btn-primary btn-sm" disabled={busy || !editName.trim()}>
                            {busy ? '…' : 'Guardar'}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(null)}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Nombre">
                        <span className="admin-cell-user">
                          <span className="avatar-initial">{c.name[0]?.toUpperCase() ?? 'N'}</span>
                          <span className="cell-meta">
                            <strong>{c.name}</strong>
                            <span>
                              <span className="badge badge-neutral">Producto</span>
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="cell-muted hide-sm" data-label="Creada">{new Date(c.createdAt).toLocaleDateString('es-CU')}</td>
                      <td data-label="Acciones">
                        <div className="item-row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditing(c);
                              setEditName(c.name);
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(c)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
</tbody>
            </table>
        </div>
      )}
      {!loading && items.length > 0 && (
        <Pagination page={page} pages={pages} total={items.length} pageSize={PAGE_SIZE} onChange={setPage} />
      )}
    </section>
  );
}