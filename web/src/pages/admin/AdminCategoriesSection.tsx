import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { Category, CategoryKind } from '../../api/types';
import { Alert, EmptyState, Field, Loading, Pagination } from '../../components/ui';

const PAGE_SIZE = 10;

export function AdminCategoriesSection() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', kind: 'negocio' as CategoryKind });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
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

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/categories/${editing.id}`, { method: 'PATCH', body: { name: editName.trim() }, auth: true });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
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
    <section className="admin-card">
      <div className="admin-head">
        <h2>Tipos de negocio</h2>
        <span className="badge badge-neutral">
          {items.length} {items.length === 1 ? 'tipo' : 'tipos'}
        </span>
      </div>

      <form onSubmit={create} className="form">
        {formError && <Alert kind="error">{formError}</Alert>}
        <div className="form-row">
          <Field
            label="Nuevo tipo de negocio *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <label className="field">
            <span className="field-label">Tipo</span>
            <select className="field-input" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CategoryKind }))}>
              <option value="negocio">Negocio</option>
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
                      <td>
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
                      <td className="hide-sm" />
                      <td>
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
                      <td>
                        <span className="admin-cell-user">
                          <span className="avatar-initial">{c.name[0]?.toUpperCase() ?? 'N'}</span>
                          <span className="cell-meta">
                            <strong>{c.name}</strong>
                            <span>
                              <span className="badge badge-success">
                                {c.kind === 'negocio' ? 'Negocio' : 'Producto'}
                              </span>
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="cell-muted hide-sm">{new Date(c.createdAt).toLocaleDateString('es-CU')}</td>
                      <td>
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