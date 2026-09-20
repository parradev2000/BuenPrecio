import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
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
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!product) {
    return <Loading />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/catalogo" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Volver al catálogo
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {product.photoUrl && (
          <img
            src={product.photoUrl}
            alt={product.name}
            decoding="async"
            className="aspect-[4/3] w-full rounded-2xl border border-slate-200 bg-slate-100 object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {product.categoryName ?? 'General'}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {product.type === 'servicio' ? 'servicio' : product.unit ?? 'unidad'}
            </span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-brand-700">{formatPrice(product.price)}</p>
          {product.distanceKm != null && (
            <p className="mt-1 text-sm text-slate-500">
              📍 A {formatDistance(product.distanceKm)} de ti
            </p>
          )}
          {product.description && <p className="mt-4 text-slate-600">{product.description}</p>}
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Negocio</h2>
      {!product.businessName ? (
        <EmptyState message="Este producto ya no está disponible." />
      ) : (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {product.businessPhotoUrl && (
            <img
              src={product.businessPhotoUrl}
              alt={product.businessName}
              decoding="async"
              className="mb-4 aspect-[16/9] w-full rounded-xl border border-slate-200 bg-slate-100 object-cover"
            />
          )}
          <h3 className="text-lg font-semibold">
            <Link to={`/catalogo/${product.businessId}`} className="text-slate-900 hover:text-brand-700">
              {product.businessName}
            </Link>
          </h3>
          {product.businessAddress && (
            <p className="mt-2 text-sm text-slate-500">
              <a
                className="inline-flex items-center gap-1.5 hover:text-brand-700"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  product.businessLatitude && product.businessLongitude
                    ? `${product.businessLatitude},${product.businessLongitude}`
                    : product.businessAddress,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <EnvironmentOutlined /> {product.businessAddress}
              </a>
            </p>
          )}
          {product.businessPhone && (
            <p className="mt-1 text-sm text-slate-500">
              <a
                className="inline-flex items-center gap-1.5 hover:text-brand-700"
                href={`tel:${product.businessPhone.replace(/[^+\d]/g, '')}`}
              >
                <PhoneOutlined /> {product.businessPhone}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
