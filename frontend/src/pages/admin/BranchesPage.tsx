import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Branch } from '../../api/types';

const emptyForm = { id: '', name: '', code: '', operationalCloseHour: '00:00', timezone: 'America/Mexico_City' };

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get<Branch[]>('/branches');
    setBranches(res.data);
  }

  function edit(b: Branch) {
    setForm({ id: b.id, name: b.name, code: b.code, operationalCloseHour: b.operationalCloseHour, timezone: b.timezone });
    setEditing(true);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await api.patch(`/branches/${form.id}`, {
          name: form.name,
          operationalCloseHour: form.operationalCloseHour,
          timezone: form.timezone,
        });
      } else {
        await api.post('/branches', {
          name: form.name,
          code: form.code,
          operationalCloseHour: form.operationalCloseHour,
          timezone: form.timezone,
        });
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar');
    }
  }

  async function toggleActive(b: Branch) {
    await api.patch(`/branches/${b.id}`, { isActive: !b.isActive });
    load();
  }

  return (
    <div>
      <h2>Sucursales</h2>

      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          placeholder="Código"
          required
          disabled={editing}
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
        />
        <label className="inline-label">
          Cierre operativo
          <input
            type="time"
            value={form.operationalCloseHour}
            onChange={(e) => setForm({ ...form, operationalCloseHour: e.target.value })}
          />
        </label>
        <input
          placeholder="Zona horaria"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        />
        <button className="btn btn-primary btn-sm" type="submit">
          {editing ? 'Guardar cambios' : 'Agregar sucursal'}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
            Cancelar
          </button>
        )}
      </form>
      {error && <p className="error-text">{error}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Código</th>
            <th>Cierre operativo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>{b.code}</td>
              <td>{b.operationalCloseHour}</td>
              <td>{b.isActive ? 'Activa' : 'Inactiva'}</td>
              <td>
                <button className="btn btn-xs" onClick={() => edit(b)}>
                  Editar
                </button>
                <button className="btn btn-xs" onClick={() => toggleActive(b)}>
                  {b.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
