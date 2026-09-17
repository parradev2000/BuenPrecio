import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminApplicationRow, ApplicationStatus } from '../../api/types';
import { Alert, EmptyState, Loading, Pagination } from '../../components/ui';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function ApplicationsSection({ onReviewed }: { onReviewed?: () => void }) {
  const [items, setItems] = useState<AdminApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const start = (page - 1) * PAGE_SIZE;
  const paged = items.slice(start, start + PAGE_SIZE);

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
      onReviewed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-head">
        <h2>Solicitudes de productor</h2>
        <div className="admin-filters">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`chip tab${filter === s ? ' tab-active' : ''}`}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
            >
              {s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobadas' : 'Rechazadas'}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState message="No hay solicitudes aquí." />}

      {!loading && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Solicitante</th>
                <th>Solicitada</th>
                <th className="hide-sm">Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="admin-cell-user">
                      <span className="avatar-initial">{initials(a.userName)}</span>
                      <span className="cell-meta">
                        <strong>{a.userName}</strong>
                        <span className="cell-muted">{a.userEmail}</span>
                      </span>
                    </span>
                  </td>
                  <td className="cell-muted">{new Date(a.createdAt).toLocaleDateString('es-CU')}</td>
                  <td className="hide-sm">
                    <span className={`badge ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                  </td>
                  <td>
                    {filter === 'pending' ? (
                      <div className="item-row-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={() => void review(a.id, 'approve')}
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={busy}
                          onClick={() => void review(a.id, 'reject')}
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : null}
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