import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { DollarOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useSeo } from '../hooks/useSeo';

const FEATURES = [
  {
    icon: <ShopOutlined />,
    title: 'Para consumidores',
    text: 'Consulta productos y servicios de negocios por tipo de negocio, con sus precios en CUP.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Para productores',
    text: 'Solicita ser productor, gestiona tus negocios y mantén tu catálogo actualizado.',
  },
  {
    icon: <DollarOutlined />,
    title: 'Transparencia',
    text: 'Una misma moneda, precios visibles y tipos de negocio claros para comparar mejor.',
  },
];

export function HomePage() {
  const { session } = useAuth();
  useSeo({
    title: 'Buen Precio - Encuentra y publica negocios locales con buenos precios',
    description:
      'Buen Precio es el catálogo de negocios locales: descubre productos y servicios cerca de ti con mejores precios. Publica tu negocio gratis.',
  });

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-white sm:px-10 sm:py-20 lg:px-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-50">
            Mercado local · precios en CUP
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Encuentra el mejor precio cerca de ti
          </h1>
          <p className="mt-4 max-w-xl text-brand-50/90 sm:text-lg">
            Consumidores: exploren productos y servicios de negocios locales con precios al día.
            Productores: publiquen su catálogo en minutos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/catalogo">
              <Button size="large" className="border-0! bg-white! dark:bg-surface! font-semibold! text-brand-700! dark:text-brand-400!">
                Explorar catálogo
              </Button>
            </Link>
            {!session && (
              <Link to="/registro">
                <Button size="large" ghost>
                  Crear cuenta gratis
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white dark:bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-xl text-brand-700 dark:text-brand-400">
              {feature.icon}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
