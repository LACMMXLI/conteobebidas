import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { BranchSelectPage } from './pages/BranchSelectPage';
import { CapturePage } from './pages/CapturePage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { HistoryPage } from './pages/admin/HistoryPage';
import { CountDetailPage } from './pages/admin/CountDetailPage';
import { BranchesPage } from './pages/admin/BranchesPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { useAuthStore } from './store/authStore';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'ADMIN' || user?.role === 'ENCARGADO') {
    return <Navigate to="/admin/historial" replace />;
  }
  return <Navigate to="/conteo" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/sucursal" element={<BranchSelectPage />} />
        <Route path="/conteo" element={<CapturePage />} />

        <Route element={<RoleRoute allow={['ADMIN', 'ENCARGADO']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="historial" replace />} />
            <Route path="historial" element={<HistoryPage />} />
            <Route path="historial/:id" element={<CountDetailPage />} />
            <Route element={<RoleRoute allow={['ADMIN']} />}>
              <Route path="sucursales" element={<BranchesPage />} />
              <Route path="productos" element={<ProductsPage />} />
              <Route path="usuarios" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
