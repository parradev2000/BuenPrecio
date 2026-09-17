import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminBusiness } from '../../api/types';
import { Alert, EmptyState, Loading } from '../../components/ui';

export function AdminBusinessesSection() {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

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

  return (
    <section>
      <div className="filters">
        <input
          className="field-input"
          placeholder="Buscar por nombre o dueño…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && visible.length === 0 && <EmptyState message="No hay negocios que coincidan." />}
      <ul className="item-list">
        {visible.map((b) => (
          <li key={b.id} className="item-row">
            <div>
              <strong>{b.name}</strong>{' '}
              <span className={`chip ${b.active ? '' : 'chip-off'}`}>{b.active ? 'Activo' : 'Inactivo'}</span>
              <p className="muted">
                {b.ownerName} · {b.ownerEmail} · {b.itemsCount} producto{b.itemsCount === 1 ? '' : 's'}
                {b.address ? ` · ${b.address}` : ''}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggle(b)}>
              {b.active ? 'Desactivar' : 'Activar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}