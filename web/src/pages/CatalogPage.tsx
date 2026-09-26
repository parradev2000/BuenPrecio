import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Image, Input, Segmented, Select } from 'antd';
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { CatalogBusiness, CatalogProduct, Category, ProductCategory } from '../api/types';
import { EmptyState, Loading } from '../components/ui';
import { useSeo } from '../hooks/useSeo';
import { useUserLocation } from '../hooks/useUserLocation';
import { formatDistance, formatPrice } from '../lib/format';

type CatalogView = 'productos' | 'negocios';

function CategorySelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{placeholder}</span>
      <Select
        allowClear
        value={value || undefined}
        onChange={(v) => onChange(v ?? '')}
        options={options}
        placeholder="Todas"
        className="w-full"
      />
    </label>
  );
}

export function CatalogPage() {
  useSeo({
    title: 'Catálogo de productos - Buen Precio',
    description:
      'Busca productos y servicios de negocios locales cerca de ti, compara precios en CUP y encuentra el mejor en Buen Precio.',
  });
  const [view, setView] = useState<CatalogView>('productos');

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Catálogo</h1>
        <Segmented
          value={view}
          onChange={(value) => setView(value as CatalogView)}
          options={[
            { label: 'Productos', value: 'productos' },
            { label: 'Negocios', value: 'negocios' },
          ]}
        />
      </div>
      <div className="mt-6">{view === 'productos' ? <ProductsCatalog /> : <BusinessesCatalog />}</div>
    </div>
  );
}

function ProductsCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { status, coords, error: locationError, enable, disable } = useUserLocation();
  const loadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, coords?.latitude, coords?.longitude, status]);

  async function load() {
    setLoading(!loadedRef.current);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId) params.set('categoryId', categoryId);
      if (status === 'enabled' && coords) {
        params.set('lat', String(coords.latitude));
        params.set('lng', String(coords.longitude));
      }
      const [productsRes, cats] = await Promise.all([
        api<{ items: CatalogProduct[] }>(`/catalog/products?${params.toString()}`),
        api<{ items: ProductCategory[] }>('/product-categories'),
      ]);
      setProducts(productsRes.items);
      setCategories(cats.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setCategoryId('');
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Producto</span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del producto…"
            prefix={<SearchOutlined className="text-slate-400" />}
            allowClear
          />
        </label>
        <CategorySelect
          placeholder="Categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      {status === 'idle' && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-brand-100 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/15 px-4 py-3 text-sm text-brand-900 dark:text-brand-300 sm:flex-row sm:items-center sm:justify-between">
          <span>Activa tu ubicación para ver primero los productos más cercanos a ti.</span>
          <Button type="primary" size="small" onClick={enable}>
            Activar ubicación
          </Button>
        </div>
      )}
      {status === 'asking' && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white dark:bg-surface px-4 py-3 text-sm text-slate-600">
          Obteniendo tu ubicación…
        </div>
      )}
      {status === 'enabled' && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white dark:bg-surface px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <EnvironmentOutlined className="text-brand-600 dark:text-brand-400" />
            Ordenando por cercanía a tu ubicación.
          </span>
          <Button type="text" size="small" onClick={disable}>
            Quitar ubicación
          </Button>
        </div>
      )}
      {locationError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{locationError}</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && (products.length > 0 || search || categoryId) && (
        <p className="mt-4 text-sm text-slate-500">
          {products.length} {products.length === 1 ? 'producto' : 'productos'}
          {status === 'enabled' && ' · ordenados por cercanía'}
        </p>
      )}

      {loading && products.length === 0 && <Loading />}
      {!loading && products.length === 0 && !error && (
        <EmptyState
          message={
            search || categoryId
              ? 'No hay productos que coincidan con tu búsqueda.'
              : 'Aún no hay productos publicados.'
          }
        />
      )}
      {!loading && products.length > 0 && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p.id}
                to={`/productos/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 dark:hover:border-brand-500/40 hover:shadow-md"
              >
                {p.photoUrl && (
                  <div
                    className="aspect-[4/3] overflow-hidden bg-slate-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Image
                      src={p.photoUrl}
                      alt=""
                      rootClassName="h-full w-full"
                      preview={{
                        mask: 'Ver foto',
                      }}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400">
                      {p.categoryName ?? 'General'}
                    </span>
                    {p.distanceKm != null && (
                      <span className="text-xs text-slate-500">a {formatDistance(p.distanceKm)}</span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">{p.name}</h2>
                  <p className="text-lg font-bold text-brand-700 dark:text-brand-400">
                    {formatPrice(p.price)}
                    {p.unit && <span className="text-sm font-normal text-slate-500"> / {p.unit}</span>}
                  </p>
                  <p className="mt-auto text-sm text-slate-500">{p.businessName}</p>
                  {p.businessAddress && (
                    <p className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <EnvironmentOutlined /> {p.businessAddress}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {(search || categoryId) && (
            <div className="mt-4">
              <Button type="text" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function BusinessesCatalog() {
  const [businesses, setBusinesses] = useState<CatalogBusiness[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId]);

  async function load() {
    setLoading(!loadedRef.current);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId) params.set('categoryId', categoryId);
      const [catalog, cats] = await Promise.all([
        api<{ items: CatalogBusiness[] }>(`/catalog?${params.toString()}`),
        api<{ items: Category[] }>('/categories'),
      ]);
      setBusinesses(catalog.items);
      setCategories(cats.items.filter((c) => c.kind === 'negocio'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setCategoryId('');
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Buscar</span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del negocio…"
            prefix={<SearchOutlined className="text-slate-400" />}
            allowClear
          />
        </label>
        <CategorySelect
          placeholder="Tipo de negocio"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && businesses.length === 0 && (
        <EmptyState
          message={
            search || categoryId
              ? 'No hay negocios que coincidan con tu búsqueda.'
              : 'No hay negocios publicados todavía.'
          }
        />
      )}
      {!loading && businesses.length > 0 && (
        <p className="mt-4 text-sm text-slate-500">
          {businesses.length} {businesses.length === 1 ? 'negocio' : 'negocios'}
        </p>
      )}
      {loading && businesses.length === 0 && <Loading />}
      {!loading && businesses.length > 0 && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
              <Link
                key={b.id}
                to={`/catalogo/${b.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 dark:hover:border-brand-500/40 hover:shadow-md"
              >
                {b.photoUrl && (
                  <div
                    className="aspect-[4/3] overflow-hidden bg-slate-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Image
                      src={b.photoUrl}
                      alt=""
                      rootClassName="h-full w-full"
                      preview={{
                        mask: 'Ver foto',
                      }}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400">
                      {b.categoryName ?? 'General'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {b.itemsCount} producto{b.itemsCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">{b.name}</h2>
                  {b.description && <p className="text-sm text-slate-500">{b.description}</p>}
                  {b.address && (
                    <p className="mt-auto inline-flex items-center gap-1 text-xs text-slate-400">
                      <EnvironmentOutlined /> {b.address}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {(search || categoryId) && (
            <div className="mt-4">
              <Button type="text" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
