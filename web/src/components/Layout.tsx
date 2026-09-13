import { Link, NavLink, Outlet } from 'react-router-dom';
import { ROLE_LABELS } from '@buenprecio/shared';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' nav-link-active' : ''}`;

export function Layout() {
  const { session, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-dot">$</span> Buen Precio
          </Link>
          <nav className="nav">
            <NavLink to="/catalogo" className={navLinkClass}>
              Catálogo
            </NavLink>
            {session ? (
              <>
                {session.user.role === 'productor' && (
                  <NavLink to="/mis-negocios" className={navLinkClass}>
                    Mis negocios
                  </NavLink>
                )}
                {session.user.role === 'administrador' && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Administración
                  </NavLink>
                )}
                <NavLink to="/mi-cuenta" className={navLinkClass}>
                  {session.user.name}
                </NavLink>
                <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/entrar" className={navLinkClass}>
                  Entrar
                </NavLink>
                <Link to="/registro" className="btn btn-primary btn-sm">
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        Buen Precio — {ROLE_LABELS.consumidor} · {ROLE_LABELS.productor} · {ROLE_LABELS.administrador}
      </footer>
    </div>
  );
}