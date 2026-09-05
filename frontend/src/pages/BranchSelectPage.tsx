import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function BranchSelectPage() {
  const branches = useAuthStore((s) => s.branches);
  const selectBranch = useAuthStore((s) => s.selectBranch);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  function choose(id: string) {
    selectBranch(id);
    navigate('/conteo');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Hola, {user?.name.split(' ')[0]}</h1>
        <p className="auth-subtitle">Selecciona tu sucursal</p>
        <div className="branch-list">
          {branches.map((b) => (
            <button key={b.id} className="branch-item" onClick={() => choose(b.id)}>
              <span className="branch-item-name">{b.name}</span>
              <span className="branch-item-code">{b.code}</span>
            </button>
          ))}
          {branches.length === 0 && <p className="empty-text">No tienes sucursales asignadas.</p>}
        </div>
        <button className="btn btn-ghost btn-block" onClick={clear}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
