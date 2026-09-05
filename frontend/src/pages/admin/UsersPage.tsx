import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Branch, Role, User } from '../../api/types';

const emptyForm = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'CAPTURISTA' as Role,
  canCorrectClosedCounts: false,
  branchIds: [] as string[],
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    api.get<Branch[]>('/branches').then((res) => setBranches(res.data));
  }, []);

  async function load() {
    const res = await api.get<User[]>('/users');
    setUsers(res.data);
  }

  function edit(u: User) {
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      canCorrectClosedCounts: u.canCorrectClosedCounts,
      branchIds: u.branchAccess.map((a) => a.branch.id),
    });
    setEditing(true);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
    setError(null);
  }

  function toggleBranch(id: string) {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id) ? f.branchIds.filter((b) => b !== id) : [...f.branchIds, id],
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await api.patch(`/users/${form.id}`, {
          name: form.name,
          role: form.role,
          canCorrectClosedCounts: form.canCorrectClosedCounts,
          branchIds: form.branchIds,
        });
      } else {
        await api.post('/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          canCorrectClosedCounts: form.canCorrectClosedCounts,
          branchIds: form.branchIds,
        });
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar');
    }
  }

  async function toggleActive(u: User) {
    await api.patch(`/users/${u.id}/active`, { isActive: !u.isActive });
    load();
  }

  return (
    <div>
      <h2>Usuarios</h2>

      <form className="stacked-form" onSubmit={submit}>
        <div className="inline-form">
          <input placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input
            placeholder="Correo"
            type="email"
            required
            disabled={editing}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {!editing && (
            <input
              placeholder="Contraseña (mín. 8)"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="ADMIN">Admin</option>
            <option value="ENCARGADO">Encargado</option>
            <option value="CAPTURISTA">Capturista</option>
          </select>
          {form.role === 'ENCARGADO' && (
            <label className="checkbox-chip">
              <input
                type="checkbox"
                checked={form.canCorrectClosedCounts}
                onChange={(e) => setForm({ ...form, canCorrectClosedCounts: e.target.checked })}
              />
              Puede corregir conteos cerrados
            </label>
          )}
        </div>
        <div className="branch-checkboxes">
          <span>Sucursales con acceso:</span>
          {branches.map((b) => (
            <label key={b.id} className="checkbox-chip">
              <input type="checkbox" checked={form.branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} />
              {b.name}
            </label>
          ))}
        </div>
        <div>
          <button className="btn btn-primary btn-sm" type="submit">
            {editing ? 'Guardar cambios' : 'Agregar usuario'}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      {error && <p className="error-text">{error}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Sucursales</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.branchAccess.map((a) => a.branch.name).join(', ') || '—'}</td>
              <td>{u.isActive ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button className="btn btn-xs" onClick={() => edit(u)}>
                  Editar
                </button>
                <button className="btn btn-xs" onClick={() => toggleActive(u)}>
                  {u.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
