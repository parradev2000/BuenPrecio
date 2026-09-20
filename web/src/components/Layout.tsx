import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Drawer, Dropdown, Layout as AntLayout, Menu, type MenuProps } from 'antd';
import { LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const { Header, Content, Footer } = AntLayout;

export function Layout() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: MenuProps['items'] = [{ key: '/', label: 'Inicio' }];
  if (session?.user.role === 'administrador') {
    navItems.push({ key: '/dashboard', label: 'Dashboard' });
  }
  navItems.push({ key: '/catalogo', label: 'Catálogo' });
  if (session) {
    if (session.user.role === 'productor') {
      navItems.push({ key: '/mis-negocios', label: 'Mis negocios' });
    }
    if (session.user.role === 'administrador') {
      navItems.push({ key: '/admin', label: 'Administración' });
    }
  } else {
    navItems.push({ key: '/entrar', label: 'Entrar' });
  }

  const navKeys = navItems.map((item) => String(item?.key));
  const selectedKey = navKeys.find(
    (key) => location.pathname === key || location.pathname.startsWith(`${key}/`),
  );

  function goTo(key: string) {
    setDrawerOpen(false);
    navigate(key);
  }

  const userMenu: MenuProps = {
    items: [
      {
        key: 'header',
        disabled: true,
        label: (
          <div className="flex flex-col py-1">
            <span className="font-medium text-slate-900">{session?.user.name}</span>
            <span className="text-xs text-slate-500">{session?.user.email}</span>
          </div>
        ),
      },
      { type: 'divider' },
      { key: '/mi-cuenta', icon: <UserOutlined />, label: 'Mi cuenta' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Salir' },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') {
        void logout();
      } else if (key !== 'header') {
        navigate(key);
      }
    },
  };

  return (
    <AntLayout className="min-h-screen">
      <Header className="sticky top-0 z-50 flex items-center border-b border-slate-200 !px-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-base font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">
              $
            </span>
            Buen Precio
          </Link>

          <Menu
            mode="horizontal"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={navItems}
            onClick={({ key }) => goTo(key)}
            className="hidden min-w-0 flex-1 justify-end border-none md:flex"
          />

          <div className="flex items-center gap-2">
            {session ? (
              <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
                <button
                  type="button"
                  className="flex items-center rounded-full"
                  aria-label={`Mi cuenta · ${session.user.name}`}
                >
                  <Avatar style={{ backgroundColor: '#059669' }}>{initials(session.user.name)}</Avatar>
                </button>
              </Dropdown>
            ) : (
              <Link to="/registro" className="hidden md:block">
                <Button type="primary">Crear cuenta</Button>
              </Link>
            )}

            <Button
              type="text"
              className="md:hidden"
              icon={<MenuOutlined />}
              aria-label="Abrir menú"
              onClick={() => setDrawerOpen(true)}
            />
          </div>
        </div>
      </Header>

      <Content>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </Content>

      <Footer className="border-t border-slate-200 !px-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-sm text-slate-500 sm:flex-row">
          <span>© 2026 BuenPrecio · Todos los derechos reservados · @ParraDEV</span>
          <Link to="/contacto" className="text-brand-700 hover:text-brand-800">
            Contáctanos
          </Link>
        </div>
      </Footer>

      <Drawer
        title="Menú"
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={280}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={navItems}
          onClick={({ key }) => goTo(key)}
          className="border-none"
        />
        {!session && (
          <Link to="/registro" onClick={() => setDrawerOpen(false)}>
            <Button type="primary" block className="mt-4">
              Crear cuenta
            </Button>
          </Link>
        )}
      </Drawer>
    </AntLayout>
  );
}
