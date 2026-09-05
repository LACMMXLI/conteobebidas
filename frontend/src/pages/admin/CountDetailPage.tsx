import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { CountDetail } from '../../api/types';

const FIELD_LABEL: Record<string, string> = { OPENING: 'Apertura', ENTRIES: 'Entradas', CLOSING: 'Cierre' };

export function CountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [count, setCount] = useState<CountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState<{ productId: string; field: 'opening' | 'entries' | 'closing' } | null>(
    null,
  );
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canCorrect = user?.role === 'ADMIN' || (user?.role === 'ENCARGADO' && user.canCorrectClosedCounts);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<CountDetail>(`/counts/${id}`);
      setCount(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function submitCorrection() {
    if (!count || !correcting) return;
    setError(null);
    const value = Number(newValue.replace(',', '.'));
    if (Number.isNaN(value) || value < 0) {
      setError('Ingresa un valor numérico válido');
      return;
    }
    if (reason.trim().length < 3) {
      setError('El motivo es obligatorio');
      return;
    }
    try {
      await api.patch(`/counts/${count.id}/items/${correcting.productId}/correct`, {
        [correcting.field]: value,
        reason,
      });
      setCorrecting(null);
      setNewValue('');
      setReason('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo aplicar la corrección');
    }
  }

  if (loading) return <p>Cargando…</p>;
  if (!count) return <p>Conteo no encontrado.</p>;

  return (
    <div>
      <h2>
        {count.branch?.name} — {count.operationalDate.slice(0, 10)}
      </h2>
      <p>
        Estado: <strong>{count.status === 'OPEN' ? 'Abierto' : 'Finalizado'}</strong> · Capturado por{' '}
        {count.createdBy?.name} · Progreso {count.progress.completed}/{count.progress.total}
        {count.finalizedBy && (
          <>
            {' '}
            · Finalizado por {count.finalizedBy.name} el{' '}
            {count.finalizedAt && new Date(count.finalizedAt).toLocaleString()}
          </>
        )}
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Apertura</th>
            <th>Entradas</th>
            <th>Cierre</th>
            {canCorrect && count.status === 'FINALIZED' && <th>Corregir</th>}
          </tr>
        </thead>
        <tbody>
          {count.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.product.name}
                {item.product.presentation ? ` (${item.product.presentation})` : ''}
              </td>
              <td>{item.opening ?? '—'}</td>
              <td>{item.entries ?? '—'}</td>
              <td>{item.closing ?? '—'}</td>
              {canCorrect && count.status === 'FINALIZED' && (
                <td className="correction-actions">
                  <button className="btn btn-xs" onClick={() => setCorrecting({ productId: item.productId, field: 'opening' })}>
                    Apertura
                  </button>
                  <button className="btn btn-xs" onClick={() => setCorrecting({ productId: item.productId, field: 'entries' })}>
                    Entradas
                  </button>
                  <button className="btn btn-xs" onClick={() => setCorrecting({ productId: item.productId, field: 'closing' })}>
                    Cierre
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {correcting && (
        <div className="modal-backdrop" onClick={() => setCorrecting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Corregir {FIELD_LABEL[correcting.field.toUpperCase()]}</h3>
            <label className="field">
              <span>Nuevo valor</span>
              <input type="number" inputMode="decimal" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            </label>
            <label className="field">
              <span>Motivo de la corrección</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </label>
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCorrecting(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={submitCorrection}>
                Guardar corrección
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>Historial de modificaciones</h3>
      {count.auditLog.length === 0 ? (
        <p className="empty-text">Sin correcciones registradas.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Campo</th>
              <th>Valor anterior</th>
              <th>Valor nuevo</th>
              <th>Usuario</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {count.auditLog.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.modifiedAt).toLocaleString()}</td>
                <td>{a.countItem.product.name}</td>
                <td>{FIELD_LABEL[a.field]}</td>
                <td>{a.previousValue ?? '—'}</td>
                <td>{a.newValue}</td>
                <td>{a.modifiedBy.name}</td>
                <td>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
