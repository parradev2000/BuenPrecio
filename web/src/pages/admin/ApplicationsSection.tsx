import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminApplicationRow, ApplicationStatus } from '../../api/types';
import { Alert, EmptyState, Loading } from '../../components/ui';

export function ApplicationsSection() {
  const [items, setItems] = useState<AdminApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: ApplicationStatus) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: AdminApplicationRow[] }>(`/admin/applications?status=${status}`, { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/applications/${id}/${action}`, { method: 'POST', auth: true });
      await load(filter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="tabs">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} type="button" className={`chip tab${filter === s ? ' tab-active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobadas' : 'Rechazadas'}
          </button>
        ))}
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay solicitudes aquí." />}
      <ul className="item-list">
        {items.map((a) => (
          <li key={a.id} className="item-row">
            <div>
              <strong>{a.userName}</strong> · {a.userEmail}
              <p className="muted">Solicitada el {new Date(a.createdAt).toLocaleDateString('es-CU')}</p>
            </div>
            {filter === 'pending' && (
              <div className="item-row-actions">
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void review(a.id, 'approve')}>
                  Aprobar
                </button>
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void review(a.id, 'reject')}>
                  Rechazar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}