import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminBusiness } from '../../api/types';
import { Alert, EmptyState, Loading } from '../../components/ui';

export function AdminBusinessesSection() {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section>
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay negocios registrados." />}
      <ul className="item-list">
        {items.map((b) => (
          <li key={b.id} className="item-row">
            <div>
              <strong>{b.name}</strong>{' '}
              <span className={`chip ${b.active ? '' : 'chip-off'}`}>{b.active ? 'activo' : 'inactivo'}</span>
              <p className="muted">
                {b.ownerName} · {b.ownerEmail} · {b.itemsCount} ítem{b.itemsCount === 1 ? '' : 's'}
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