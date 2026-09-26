import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnvironmentOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Image } from 'antd';
import { api } from '../api/client';
import type { CatalogBusinessDetail } from '../api/types';
import { formatPrice } from '../lib/format';
import { EmptyState, Loading } from '../components/ui';
import { useSeo } from '../hooks/useSeo';

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<CatalogBusinessDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ business: CatalogBusinessDetail }>(`/catalog/businesses/${id}`)
      .then((res) => setBusiness(res.business))
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  }, [id]);

  useSeo({
    title: business ? `${business.name} - Buen Precio` : 'Negocio - Buen Precio',
    description: business?.description ?? `${business?.name ?? 'Negocio'} en el catálogo de Buen Precio.`,
    image: business?.photoUrl,
  });

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (!business) {
    return <Loading />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/catalogo" className="text-sm font-medium text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300">
        ← Volver al catálogo
      </Link>

      {business.photoUrl && (
        <Image
          src={business.photoUrl}
          alt={business.name}
          className="mt-4 aspect-[16/9] w-full rounded-2xl border border-slate-200 bg-slate-100 object-cover"
        />
      )}

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {business.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{business.categoryName ?? 'General'}</p>
      {business.description && <p className="mt-3 text-slate-600">{business.description}</p>}
      {business.address && (
        <p className="mt-2 text-sm text-slate-500">
          <a
            className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-400"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              business.latitude && business.longitude
                ? `${business.latitude},${business.longitude}`
                : business.address,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <EnvironmentOutlined /> {business.address}
          </a>
        </p>
      )}
      {(business.phones?.length ? business.phones : business.phone ? [business.phone] : []).map(
        (phone, index) => (
          <p key={index} className="mt-1 text-sm text-slate-500">
            <a
              className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-400"
              href={`tel:${phone.replace(/[^+\d]/g, '')}`}
            >
              <PhoneOutlined /> {phone}
            </a>
          </p>
        ),
      )}
      {business.email && (
        <p className="mt-1 text-sm text-slate-500">
          <a
            className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-400"
            href={`mailto:${business.email}`}
          >
            <MailOutlined /> {business.email}
          </a>
        </p>
      )}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Productos y servicios</h2>
      {business.items.length === 0 && (
        <EmptyState message="Este negocio aún no tiene productos publicados." />
      )}
      {business.items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-surface shadow-sm">
          {business.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {item.photoUrl && (
                  <Image
                    src={item.photoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <div>
                  <div className="font-medium text-slate-900">
                    {item.name}{' '}
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {item.type === 'producto' ? item.unit ?? 'unidad' : 'servicio'}
                    </span>
                  </div>
                  {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                </div>
              </div>
              <div className="text-base font-bold text-brand-700 dark:text-brand-400 sm:text-right">
                {formatPrice(item.price)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
