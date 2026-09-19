import { useCallback, useEffect, useState } from 'react';
import { ROLE_LABELS } from '@buenprecio/shared';
import { api } from '../../api/client';
import type { AdminUser, RoleName } from '../../api/types';
import { Alert, EmptyState, Loading, Pagination } from '../../components/ui';

const ROLE_OPTIONS: RoleName[] = ['consumidor', 'productor', 'administrador'];
const PAGE_SIZE = 10;

const STATUS_BADGE: Record<AdminUser['status'], string> = {
  active: 'badge-success',
  suspended: 'badge-danger',
};

const STATUS_LABEL: Record<AdminUser['status'], string> = {
  active: 'Activo',
  suspended: 'Suspendido',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function AdminUsersSection() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
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
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      const res = await api<{ items: AdminUser[] }>(`/admin/users?${params.toString()}`, { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(user: AdminUser, patch: { status?: AdminUser['status']; role?: RoleName }) {
    setBusyId(user.id);
    setError(null);
    try {
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: patch, auth: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: AdminUser) {
    if (!window.confirm(`¿Eliminar a ${user.name} (${user.email})? Se borrarán sus negocios y productos.`)) {
      return;
    }
    setBusyId(user.id);
    setError(null);
    try {
      await api(`/admin/users/${user.id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-head">
        <h2>Usuarios</h2>
        <div className="admin-filters">
          <input
            className="field-input"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="field-input"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay usuarios que coincidan." />}

      {!loading && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th className="hide-sm">Creado</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => (
                <tr key={u.id}>
                  <td data-label="Usuario">
                    <span className="admin-cell-user">
                      <span className="avatar-initial">{initials(u.name)}</span>
                      <span className="cell-meta">
                        <strong>{u.name}</strong>
                        <span className="cell-muted">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="cell-muted hide-sm" data-label="Creado">{new Date(u.createdAt).toLocaleDateString('es-CU')}</td>
                  <td data-label="Rol">
                    <select
                      className="field-input field-input-sm"
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => void change(u, { role: e.target.value as RoleName })}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Estado">
                    <span className={`badge ${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                  </td>
                  <td data-label="Acciones">
                    <div className="item-row-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${u.status === 'active' ? 'btn-secondary' : 'btn-ghost'}`}
                        disabled={busyId === u.id}
                        onClick={() => void change(u, { status: u.status === 'active' ? 'suspended' : 'active' })}
                      >
                        {u.status === 'active' ? 'Suspender' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={busyId === u.id}
                        onClick={() => void remove(u)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
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