import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminUser, RoleName } from '../../api/types';
import { Alert, EmptyState, Loading } from '../../components/ui';

const ROLE_OPTIONS: RoleName[] = ['consumidor', 'productor', 'administrador'];

export function AdminUsersSection() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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
    <section>
      <div className="filters">
        <input
          className="field-input"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Todos los roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay usuarios que coincidan." />}
      <ul className="item-list">
        {items.map((u) => (
          <li key={u.id} className="item-row">
            <div>
              <strong>{u.name}</strong> · {u.email}
              <p className="muted">
                <span className={`chip ${u.status === 'suspended' ? 'chip-off' : ''}`}>{u.status}</span>{' '}
                rol: {u.role}
              </p>
            </div>
            <div className="item-row-actions">
              <select
                className="field-input field-input-sm"
                value={u.role}
                disabled={busyId === u.id}
                onChange={(e) => void change(u, { role: e.target.value as RoleName })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`btn btn-sm ${u.status === 'active' ? 'btn-ghost' : 'btn-secondary'}`}
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
          </li>
        ))}
      </ul>
    </section>
  );
}