import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { getPendingForCount, markSynced, offlineDb, saveLocalEdit } from '../store/offlineDb';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { QuantityStepper } from '../components/QuantityStepper';
import { ProgressBar } from '../components/ProgressBar';
import type { Count, CountItem, MissingItem } from '../api/types';

type Field = 'opening' | 'entries' | 'closing';

function toNumber(v: string | null): number | null {
  return v === null ? null : Number(v);
}

export function CapturePage() {
  const branchId = useAuthStore((s) => s.selectedBranchId);
  const branches = useAuthStore((s) => s.branches);
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [count, setCount] = useState<Count | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [missing, setMissing] = useState<MissingItem[] | null>(null);
  const [savingCount, setSavingCount] = useState(0);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const branch = branches.find((b) => b.id === branchId);

  useEffect(() => {
    if (!branchId) {
      navigate('/sucursal');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Count>('/counts/today', { params: { branchId } });
      let data = res.data;

      // Reaplicar ediciones locales pendientes (por si la app se cerró sin conexión).
      const pending = await getPendingForCount(data.id);
      if (pending.length > 0) {
        data = {
          ...data,
          items: data.items.map((item) => {
            const p = pending.find((x) => x.productId === item.productId);
            if (!p) return item;
            return {
              ...item,
              opening: p.opening !== undefined ? String(p.opening) : item.opening,
              entries: p.entries !== undefined ? String(p.entries) : item.entries,
              closing: p.closing !== undefined ? String(p.closing) : item.closing,
            };
          }),
        };
      }
      setCount(data);
    } finally {
      setLoading(false);
    }
  }

  // Reintento periódico de sincronización de lo pendiente (offline-first).
  useEffect(() => {
    const interval = setInterval(() => flushPending(), 5000);
    window.addEventListener('online', flushPending);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', flushPending);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count?.id]);

  async function flushPending() {
    if (!count || !navigator.onLine) return;
    const pending = await getPendingForCount(count.id);
    for (const p of pending) {
      try {
        await api.patch(`/counts/${p.countId}/items/${p.productId}`, {
          opening: p.opening,
          entries: p.entries,
          closing: p.closing,
        });
        await markSynced(p.key);
      } catch {
        // se reintentará en el próximo ciclo
      }
    }
  }

  const handleChange = useCallback(
    (productId: string, field: Field, value: number) => {
      setCount((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.productId === productId ? { ...item, [field]: String(value) } : item,
          ),
        };
      });

      saveLocalEdit(count?.id ?? '', productId, { [field]: value });
      setSavingCount((c) => c + 1);

      const key = productId;
      if (timers.current[key]) clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(async () => {
        if (!count) return;
        try {
          await api.patch(`/counts/${count.id}/items/${productId}`, { [field]: value });
          await markSynced(`${count.id}:${productId}`);
        } catch {
          // queda pendiente en la cola local; se reintentará
        } finally {
          setSavingCount((c) => Math.max(0, c - 1));
        }
      }, 500);
    },
    [count],
  );

  async function handleFinalize() {
    if (!count) return;
    setFinalizing(true);
    setMissing(null);
    try {
      await flushPending();
      const res = await api.post<Count>(`/counts/${count.id}/finalize`);
      setCount(res.data);
      await offlineDb.pendingEdits.where({ countId: count.id }).delete();
    } catch (err: any) {
      if (err?.response?.status === 400 && err.response.data?.missing) {
        setMissing(err.response.data.missing as MissingItem[]);
      }
    } finally {
      setFinalizing(false);
    }
  }

  const { refrigerador, almacen } = useMemo(() => {
    const items = count?.items ?? [];
    return {
      refrigerador: items.filter((i) => i.product.storageArea === 'REFRIGERADOR'),
      almacen: items.filter((i) => i.product.storageArea === 'ALMACEN'),
    };
  }, [count]);

  if (loading) return <div className="center-screen">Cargando conteo…</div>;
  if (!count) return <div className="center-screen">No se pudo cargar el conteo.</div>;

  const locked = count.status === 'FINALIZED';

  return (
    <div className="capture-screen">
      <header className="capture-header">
        <div>
          <h1>{branch?.name}</h1>
          <span className="capture-date">{count.operationalDate}</span>
        </div>
        <div className="capture-status">
          {!online && <span className="badge badge-offline">Sin conexión</span>}
          {savingCount > 0 && online && <span className="badge badge-saving">Guardando…</span>}
          {locked && <span className="badge badge-locked">Finalizado</span>}
        </div>
      </header>

      <ProgressBar completed={count.progress.completed} total={count.progress.total} />

      {missing && missing.length > 0 && (
        <div className="missing-banner">
          <strong>Faltan {missing.length} productos por capturar:</strong>
          <ul>
            {missing.slice(0, 8).map((m) => (
              <li key={m.productId}>{m.productName}</li>
            ))}
            {missing.length > 8 && <li>y {missing.length - 8} más…</li>}
          </ul>
        </div>
      )}

      <main className="capture-list">
        {refrigerador.length > 0 && (
          <section>
            <h2 className="section-title">🧊 Refrigeradores</h2>
            {refrigerador.map((item) => (
              <ProductCard key={item.id} item={item} disabled={locked} onChange={handleChange} missing={missing} />
            ))}
          </section>
        )}
        {almacen.length > 0 && (
          <section>
            <h2 className="section-title">📦 Almacén</h2>
            {almacen.map((item) => (
              <ProductCard key={item.id} item={item} disabled={locked} onChange={handleChange} missing={missing} />
            ))}
          </section>
        )}
      </main>

      <footer className="capture-footer">
        {!locked ? (
          <button className="btn btn-primary btn-block btn-lg" onClick={handleFinalize} disabled={finalizing}>
            {finalizing ? 'Finalizando…' : 'Finalizar conteo'}
          </button>
        ) : (
          <p className="locked-text">Este conteo está finalizado y bloqueado.</p>
        )}
      </footer>
    </div>
  );
}

function ProductCard({
  item,
  disabled,
  onChange,
  missing,
}: {
  item: CountItem;
  disabled: boolean;
  onChange: (productId: string, field: Field, value: number) => void;
  missing: MissingItem[] | null;
}) {
  const missingInfo = missing?.find((m) => m.productId === item.productId);

  return (
    <div className={`product-card ${missingInfo ? 'product-card--missing' : ''}`}>
      <div className="product-card-title">
        <span>{item.product.name}</span>
        {item.product.presentation && <span className="product-presentation">{item.product.presentation}</span>}
      </div>
      <QuantityStepper
        label="Apertura"
        value={toNumber(item.opening)}
        disabled={disabled}
        onChange={(v) => onChange(item.productId, 'opening', v)}
      />
      <QuantityStepper
        label="Entradas"
        value={toNumber(item.entries)}
        disabled={disabled}
        onChange={(v) => onChange(item.productId, 'entries', v)}
      />
      <QuantityStepper
        label="Cierre"
        value={toNumber(item.closing)}
        disabled={disabled}
        onChange={(v) => onChange(item.productId, 'closing', v)}
      />
    </div>
  );
}
