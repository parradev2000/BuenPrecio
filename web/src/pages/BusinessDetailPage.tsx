import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CatalogBusinessDetail } from '../api/types';
import { formatPrice } from '../lib/format';
import { EmptyState, Loading } from '../components/ui';

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<CatalogBusinessDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ business: CatalogBusinessDetail }>(`/catalog/businesses/${id}`)
      .then((res) => setBusiness(res.business))
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  }, [id]);

  if (error) {
    return <p className="alert alert-error">{error}</p>;
  }
  if (!business) {
    return <Loading />;
  }

  return (
    <div className="page">
      <Link to="/catalogo" className="back-link">
        ← Volver al catálogo
      </Link>
      <h1>{business.name}</h1>
      <p className="muted">{business.categoryName ?? 'Categoría general'}</p>
      {business.description && <p>{business.description}</p>}
      {business.address && <p className="muted">📍 {business.address}</p>}
      {business.phone && <p className="muted">☎️ {business.phone}</p>}

      <h2 className="section-title">Productos y servicios</h2>
      {business.items.length === 0 && (
        <EmptyState message="Este negocio aún no tiene productos publicados." />
      )}
      <ul className="item-list">
        {business.items.map((item) => (
          <li key={item.id} className="item-row">
            <div className={item.photoUrl ? 'item-photo-content' : undefined}>
              {item.photoUrl && <img src={item.photoUrl} alt="" className="item-thumb" loading="lazy" />}
              <div>
                <div className="item-name">
                  {item.name}{' '}
                  <span className="chip">{item.type === 'producto' ? item.unit ?? 'unidad' : 'servicio'}</span>
                </div>
                {item.description && <p className="muted">{item.description}</p>}
              </div>
            </div>
            <div className="item-price">{formatPrice(item.price)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}