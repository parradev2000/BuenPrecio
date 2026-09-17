import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CatalogProductDetail } from '../api/types';
import { EmptyState, Loading } from '../components/ui';
import { useSeo } from '../hooks/useSeo';
import { useUserLocation } from '../hooks/useUserLocation';
import { formatDistance, formatPrice } from '../lib/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<CatalogProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status, coords } = useUserLocation();

  useEffect(() => {
    const params = new URLSearchParams();
    if (status === 'enabled' && coords) {
      params.set('lat', String(coords.latitude));
      params.set('lng', String(coords.longitude));
    }
    const qs = params.toString();
    void api<{ item: CatalogProductDetail }>(`/catalog/products/${id}${qs ? `?${qs}` : ''}`)
      .then((res) => setProduct(res.item))
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status, coords?.latitude, coords?.longitude]);

  useSeo({
    title: product ? `${product.name} - Buen Precio` : 'Producto - Buen Precio',
    description: product?.description ?? `${product?.name ?? 'Producto'} en el catálogo de Buen Precio.`,
    image: product?.photoUrl ?? undefined,
  });

  if (error) {
    return <p className="alert alert-error">{error}</p>;
  }
  if (!product) {
    return <Loading />;
  }

  return (
    <div className="page">
      <Link to="/catalogo" className="back-link">
        ← Volver al catálogo
      </Link>
      {product.photoUrl && (
        <img src={product.photoUrl} alt={product.name} className="detail-photo" decoding="async" />
      )}
      <h1>{product.name}</h1>
      <p>
        <span className="chip">{product.categoryName ?? 'General'}</span>{' '}
        <span className="chip">{product.type === 'servicio' ? 'servicio' : product.unit ?? 'unidad'}</span>
      </p>
      <p className="price" style={{ fontSize: '1.4rem' }}>
        {formatPrice(product.price)}
      </p>
      {product.distanceKm != null && (
        <p className="result-count">📍 A {formatDistance(product.distanceKm)} de ti</p>
      )}
      {product.description && <p>{product.description}</p>}

      <h2 className="section-title">Negocio</h2>
      {!product.businessName ? (
        <EmptyState message="Este producto ya no está disponible." />
      ) : (
        <div className="card">
          {product.businessPhotoUrl && (
            <img
              src={product.businessPhotoUrl}
              alt={product.businessName}
              className="detail-photo"
              decoding="async"
            />
          )}
          <h3>
            <Link to={`/catalogo/${product.businessId}`}>{product.businessName}</Link>
          </h3>
          {product.businessAddress && (
            <p className="muted">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  product.businessLatitude && product.businessLongitude
                    ? `${product.businessLatitude},${product.businessLongitude}`
                    : product.businessAddress,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 {product.businessAddress}
              </a>
            </p>
          )}
          {product.businessPhone && (
            <p className="muted">
              <a href={`tel:${product.businessPhone.replace(/[^+\d]/g, '')}`}>
                ☎️ {product.businessPhone}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}