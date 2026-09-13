import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GuestOnly, RequireAuth, RequireRole } from './components/guards';
import { AdminPage } from './pages/AdminPage';
import { AccountPage } from './pages/AccountPage';
import { BusinessDetailPage } from './pages/BusinessDetailPage';
import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProducerPage } from './pages/ProducerPage';
import { BusinessItemsPage } from './pages/BusinessItemsPage';
import { RegisterPage } from './pages/RegisterPage';

export function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/catalogo/:id" element={<BusinessDetailPage />} />
        <Route
          path="/entrar"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/registro"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route
          path="/mi-cuenta"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mis-negocios"
          element={
            <RequireRole role="productor">
              <ProducerPage />
            </RequireRole>
          }
        />
        <Route
          path="/mis-negocios/:id"
          element={
            <RequireRole role="productor">
              <BusinessItemsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole role="administrador">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}