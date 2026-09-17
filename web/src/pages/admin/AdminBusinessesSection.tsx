import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminBusiness } from '../../api/types';
import { Alert, EmptyState, Loading, Pagination } from '../../components/ui';

const PAGE_SIZE = 10;

export function AdminBusinessesSection() {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: AdminBusiness[] }>('/admin/businesses', { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }

  async function toggle(business: AdminBusiness) {
    if (business.active && !window.confirm(`¿Desactivar "${business.name}"? Dejará de verse en el catálogo.`)) {
      return;
    }
    setError(null);
    try {
      await api(`/businesses/${business.id}`, {
        method: 'PATCH',
        body: { active: !business.active },
        auth: true,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  }

  const query = search.trim().toLowerCase();
  const visible = items.filter((b) => {
    if (query) {
      const haystack = `${b.name} ${b.ownerName} ${b.ownerEmail}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (status === 'active' && !b.active) return false;
    if (status === 'inactive' && b.active) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const start = (page - 1) * PAGE_SIZE;
  const paged = visible.slice(start, start + PAGE_SIZE);

  return (
    <section className="admin-card">
      <div className="admin-head">
        <h2>Negocios</h2>
        <div className="admin-filters">
          <input
            className="field-input"
            placeholder="Buscar por nombre o dueño…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="field-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && visible.length === 0 && <EmptyState message="No hay negocios que coincidan." />}

      {!loading && visible.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-wide">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Estado</th>
                <th className="hide-sm">Dueño</th>
                <th className="hide-sm">Correo</th>
                <th className="hide-sm">Ubicación</th>
                <th>Productos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((b) => (
                <tr key={b.id}>
                  <td data-label="Negocio">
                    <span className="admin-cell-user">
                      <span className="avatar-initial">{b.name[0]?.toUpperCase() ?? 'N'}</span>
                      <strong>{b.name}</strong>
                    </span>
                  </td>
                  <td data-label="Estado">
                    <span className={`badge ${b.active ? 'badge-success' : 'badge-neutral'}`}>
                      {b.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="hide-sm" data-label="Dueño">{b.ownerName}</td>
                  <td className="cell-muted hide-sm" data-label="Correo">{b.ownerEmail}</td>
                  <td className="cell-muted hide-sm" data-label="Ubicación">{b.address ?? '—'}</td>
                  <td data-label="Productos">{b.itemsCount}</td>
                  <td data-label="Acciones">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggle(b)}>
                      {b.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
</tbody>
            </table>
        </div>
      )}
      {!loading && visible.length > 0 && (
        <Pagination page={page} pages={pages} total={visible.length} pageSize={PAGE_SIZE} onChange={setPage} />
      )}
    </section>
  );
}