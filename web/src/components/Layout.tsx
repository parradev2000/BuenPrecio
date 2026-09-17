import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' nav-link-active' : ''}`;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function Layout() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onPointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-dot">$</span> Buen Precio
          </Link>
          <nav className="nav">
            {session?.user.role === 'administrador' && (
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
            )}
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
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={`Mi cuenta · ${session.user.name}`}
                  >
                    <span className="avatar" aria-hidden="true">
                      {initials(session.user.name)}
                    </span>
                  </button>
                  {menuOpen && (
                    <div className="dropdown-menu" role="menu">
                      <div className="dropdown-header">
                        <span className="dropdown-name">{session.user.name}</span>
                        <span className="dropdown-email">{session.user.email}</span>
                      </div>
                      <div className="dropdown-divider" />
                      <NavLink to="/mi-cuenta" role="menuitem" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                        Mi cuenta
                      </NavLink>
                      <div className="dropdown-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="dropdown-item"
                        onClick={() => {
                          setMenuOpen(false);
                          void logout();
                        }}
                      >
                        Salir
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <NavLink to="/entrar" className={navLinkClass}>
                  Entrar
                </NavLink>
                <Link to="/registro" className="btn btn-primary btn-sm header-cta">
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
        <div className="footer-inner">
          <span className="footer-copyright">© 2026 BuenPrecio · Todos los derechos reservados · @ParraDEV</span>
          <Link to="/contacto" className="footer-link">
            Contáctanos
          </Link>
        </div>
      </footer>
    </div>
  );
}