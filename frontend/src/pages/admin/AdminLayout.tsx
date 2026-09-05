import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  return (
    <div className="admin-layout">
      <header className="admin-topbar">
        <h1>Panel administrativo</h1>
        <div className="admin-topbar-user">
          <span>{user?.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={clear}>
            Salir
          </button>
        </div>
      </header>
      <nav className="admin-nav">
        <NavLink to="/admin/historial" className={({ isActive }) => (isActive ? 'active' : '')}>
          Historial
        </NavLink>
        {user?.role === 'ADMIN' && (
          <>
            <NavLink to="/admin/sucursales" className={({ isActive }) => (isActive ? 'active' : '')}>
              Sucursales
            </NavLink>
            <NavLink to="/admin/productos" className={({ isActive }) => (isActive ? 'active' : '')}>
              Productos
            </NavLink>
            <NavLink to="/admin/usuarios" className={({ isActive }) => (isActive ? 'active' : '')}>
              Usuarios
            </NavLink>
          </>
        )}
        <NavLink to="/conteo" className={({ isActive }) => (isActive ? 'active' : '')}>
          Ir a captura
        </NavLink>
      </nav>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
