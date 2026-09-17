import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { CatalogBusiness, Category } from '../api/types';
import { EmptyState, Field, Loading } from '../components/ui';
import { useSeo } from '../hooks/useSeo';

export function CatalogPage() {
  useSeo({
    title: 'Catálogo de negocios - Buen Precio',
    description:
      'Explora negocios locales, sus productos y servicios, con precios visibles y tipos de negocio claros para comparar mejor.',
  });
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
      const [catalog, cats] = await Promise.all([
        api<{ items: CatalogBusiness[] }>(`/catalog?${new URLSearchParams({ search, categoryId })}`),
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
    <div className="page">
      <div className="page-header">
        <h1>Catálogo de negocios</h1>
        {(search || categoryId) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="filters">
        <Field
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre del negocio…"
        />
        <label className="field">
          <span className="field-label">Tipo de negocio</span>
          <select
            className="field-input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
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
      {!loading && businesses.length > 0 && (
        <p className="result-count">
          {businesses.length} {businesses.length === 1 ? 'negocio' : 'negocios'}
        </p>
      )}
      {loading && businesses.length === 0 && <Loading />}
      {!loading && businesses.length === 0 && <EmptyState message="No hay negocios publicados todavía." />}
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
              <span className="muted">{b.itemsCount} producto{b.itemsCount === 1 ? '' : 's'}</span>
            </div>
            <h2>{b.name}</h2>
            {b.description && <p className="muted">{b.description}</p>}
            {b.address && <p className="muted">📍 {b.address}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}