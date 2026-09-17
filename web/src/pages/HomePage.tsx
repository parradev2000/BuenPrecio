import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSeo } from '../hooks/useSeo';

export function HomePage() {
  const { session } = useAuth();
  useSeo({
    title: 'Buen Precio - Encuentra y publica negocios locales con buenos precios',
    description:
      'Buen Precio es el catálogo de negocios locales: descubre productos y servicios cerca de ti con mejores precios. Publica tu negocio gratis.',
  });

  return (
    <div className="home">
      <section className="hero">
        <h1>Encuentra el mejor precio cerca de ti</h1>
        <p className="hero-lead">
          Consumidores: exploren productos y servicios de negocios locales con precios al día.
          Productores: publiquen su catálogo en minutos.
        </p>
        <div className="hero-actions">
          <Link to="/catalogo" className="btn btn-primary">
            Explorar catálogo
          </Link>
          {!session && (
            <Link to="/registro" className="btn btn-secondary">
              Crear cuenta gratis
            </Link>
          )}
        </div>
      </section>
      <section className="cards">
        <div className="card">
          <h2>Para consumidores</h2>
          <p>Consulta productos y servicios de negocios por tipo de negocio, con sus precios en CUP.</p>
        </div>
        <div className="card">
          <h2>Para productores</h2>
          <p>Solicita ser productor, gestiona tus negocios y mantén tu catálogo actualizado.</p>
        </div>
        <div className="card">
          <h2>Transparencia</h2>
          <p>Una misma moneda, precios visibles y tipos de negocio claros para comparar mejor.</p>
        </div>
      </section>
    </div>
  );
}