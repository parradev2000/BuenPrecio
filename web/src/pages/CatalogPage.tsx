import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { CatalogBusiness, CatalogProduct, Category } from '../api/types';
import { EmptyState, Field, Loading } from '../components/ui';
import { useSeo } from '../hooks/useSeo';
import { useUserLocation } from '../hooks/useUserLocation';
import { formatDistance, formatPrice } from '../lib/format';

type CatalogView = 'productos' | 'negocios';

export function CatalogPage() {
  useSeo({
    title: 'Catálogo de productos - Buen Precio',
    description:
      'Busca productos y servicios de negocios locales cerca de ti, compara precios en CUP y encuentra el mejor en Buen Precio.',
  });
  const [view, setView] = useState<CatalogView>('productos');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Catálogo</h1>
      </div>
      <div className="tabs">
        <button
          type="button"
          className={view === 'productos' ? 'tab tab-active' : 'tab'}
          onClick={() => setView('productos')}
        >
          Productos
        </button>
        <button
          type="button"
          className={view === 'negocios' ? 'tab tab-active' : 'tab'}
          onClick={() => setView('negocios')}
        >
          Negocios
        </button>
      </div>
      {view === 'productos' ? <ProductsCatalog /> : <BusinessesCatalog />}
    </div>
  );
}

function ProductsCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [place, setPlace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { status, coords, error: locationError, enable, disable } = useUserLocation();
  const loadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, place, coords?.latitude, coords?.longitude, status]);

  async function load() {
    setLoading(!loadedRef.current);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (place) params.set('place', place);
      if (status === 'enabled' && coords) {
        params.set('lat', String(coords.latitude));
        params.set('lng', String(coords.longitude));
      }
      const res = await api<{ items: CatalogProduct[] }>(`/catalog/products?${params.toString()}`);
      setProducts(res.items);
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
    setPlace('');
  }

  return (
    <>
      <div className="filters">
        <Field
          label="Producto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre del producto…"
        />
        <Field
          label="Lugar"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Dirección, barrio o ciudad…"
        />
      </div>

      {status === 'idle' && (
        <div className="loc-banner">
          <span>Activa tu ubicación para ver primero los productos más cercanos a ti.</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={enable}>
            Activar ubicación
          </button>
        </div>
      )}
      {status === 'asking' && (
        <div className="loc-banner">
          <span>Obteniendo tu ubicación…</span>
        </div>
      )}
      {status === 'enabled' && (
        <div className="loc-banner">
          <span className="loc-note">📍 Ordenando por cercanía a tu ubicación.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={disable}>
            Quitar ubicación
          </button>
        </div>
      )}
      {locationError && <p className="alert alert-error">{locationError}</p>}

      {error && <p className="alert alert-error">{error}</p>}

      {!loading && !error && (products.length > 0 || search || place) && (
        <p className="result-count">
          {products.length} {products.length === 1 ? 'producto' : 'productos'}
          {status === 'enabled' && ' · ordenados por cercanía'}
        </p>
      )}

      {loading && products.length === 0 && <Loading />}
      {!loading && products.length === 0 && !error && (
        <EmptyState message={search || place ? 'No hay productos que coincidan con tu búsqueda.' : 'Aún no hay productos publicados.'} />
      )}
      {!loading && products.length > 0 && (
        <>
          <div className="grid">
            {products.map((p) => (
              <Link key={p.id} to={`/productos/${p.id}`} className="grid-item">
                {p.photoUrl && (
                  <div className="grid-item-photo">
                    <img src={p.photoUrl} alt="" loading="lazy" decoding="async" />
                  </div>
                )}
                <div className="grid-item-top">
                  <span className="chip">{p.categoryName ?? 'General'}</span>
                  {p.distanceKm != null && (
                    <span className="distance-badge">a {formatDistance(p.distanceKm)}</span>
                  )}
                </div>
                <h2>{p.name}</h2>
                <p className="price">
                  {formatPrice(p.price)}
                  {p.unit && ` / ${p.unit}`}
                </p>
                <p className="muted">{p.businessName}</p>
                {p.businessAddress && <p className="muted">📍 {p.businessAddress}</p>}
              </Link>
            ))}
          </div>
          {(search || place) && (
            <div className="empty-action">
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Limpiar filtros
              </button>
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
  const [place, setPlace] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, place, categoryId]);

  async function load() {
    setLoading(!loadedRef.current);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (place) params.set('place', place);
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
    setPlace('');
    setCategoryId('');
  }

  return (
    <>
      <h2 className="result-count" style={{ marginTop: '1rem' }}>
        Catálogo de negocios
      </h2>
      <div className="filters">
        <Field
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre del negocio…"
        />
        <Field
          label="Lugar"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Dirección, barrio o ciudad…"
        />
        <label className="field">
          <span className="field-label">Tipo de negocio</span>
          <select className="field-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {!loading && businesses.length === 0 && (
        <EmptyState message={search || place || categoryId ? 'No hay negocios que coincidan con tu búsqueda.' : 'No hay negocios publicados todavía.'} />
      )}
      {!loading && businesses.length > 0 && (
        <p className="result-count">
          {businesses.length} {businesses.length === 1 ? 'negocio' : 'negocios'}
        </p>
      )}
      {loading && businesses.length === 0 && <Loading />}
      {!loading && businesses.length > 0 && (
        <>
          <div className="grid">
            {businesses.map((b) => (
              <Link key={b.id} to={`/catalogo/${b.id}`} className="grid-item">
                {b.photoUrl && (
                  <div className="grid-item-photo">
                    <img src={b.photoUrl} alt="" loading="lazy" decoding="async" />
                  </div>
                )}
                <div className="grid-item-top">
                  <span className="chip">{b.categoryName ?? 'General'}</span>
                  <span className="muted">
                    {b.itemsCount} producto{b.itemsCount === 1 ? '' : 's'}
                  </span>
                </div>
                <h2>{b.name}</h2>
                {b.description && <p className="muted">{b.description}</p>}
                {b.address && <p className="muted">📍 {b.address}</p>}
              </Link>
            ))}
          </div>
          {(search || place || categoryId) && (
            <div className="empty-action">
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Limpiar filtros
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}