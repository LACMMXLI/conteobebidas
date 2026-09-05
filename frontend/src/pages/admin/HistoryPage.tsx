import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Branch, Count, CountStatus } from '../../api/types';

export function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [counts, setCounts] = useState<Count[]>([]);
  const [loading, setLoading] = useState(true);

  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<CountStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    api.get('/branches/mine').then((res) => setBranches(res.data));
  }, []);

  useEffect(() => {
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, status, dateFrom, dateTo]);

  async function fetchCounts() {
    setLoading(true);
    try {
      const res = await api.get<Count[]>('/counts', {
        params: {
          branchId: branchId || undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      setCounts(res.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Historial de conteos</h2>
      <div className="filters-bar">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as CountStatus | '')}>
          <option value="">Cualquier estado</option>
          <option value="OPEN">Abierto</option>
          <option value="FINALIZED">Finalizado</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha operativa</th>
              <th>Sucursal</th>
              <th>Estado</th>
              <th>Progreso</th>
              <th>Capturado por</th>
              <th>Finalizado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {counts.map((c) => (
              <tr key={c.id}>
                <td>{c.operationalDate.slice(0, 10)}</td>
                <td>{c.branch?.name}</td>
                <td>
                  <span className={`status-pill status-${c.status.toLowerCase()}`}>
                    {c.status === 'OPEN' ? 'Abierto' : 'Finalizado'}
                  </span>
                </td>
                <td>
                  {c.progress.completed}/{c.progress.total}
                </td>
                <td>{c.createdBy?.name}</td>
                <td>{c.finalizedAt ? new Date(c.finalizedAt).toLocaleString() : '—'}</td>
                <td>
                  <Link className="btn btn-sm btn-secondary" to={`/admin/historial/${c.id}`}>
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {counts.length === 0 && (
              <tr>
                <td colSpan={7}>No hay conteos con esos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {user?.role !== 'ADMIN' && <p className="hint-text">Solo ves las sucursales a las que tienes acceso.</p>}
    </div>
  );
}
