import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Branch, Product, StorageArea } from '../../api/types';

const emptyForm = {
  id: '',
  name: '',
  category: '',
  presentation: '',
  storageArea: 'REFRIGERADOR' as StorageArea,
  displayOrder: 0,
  branchIds: [] as string[],
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    api.get<Branch[]>('/branches').then((res) => setBranches(res.data));
  }, []);

  async function load() {
    const res = await api.get<Product[]>('/products');
    setProducts(res.data);
  }

  function edit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      category: p.category,
      presentation: p.presentation ?? '',
      storageArea: p.storageArea,
      displayOrder: p.displayOrder,
      branchIds: p.branchAssignments?.map((a) => a.branchId) ?? [],
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
    const payload = {
      name: form.name,
      category: form.category,
      presentation: form.presentation || undefined,
      storageArea: form.storageArea,
      displayOrder: Number(form.displayOrder),
      branchIds: form.branchIds,
    };
    try {
      if (editing) {
        await api.patch(`/products/${form.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar');
    }
  }

  async function toggleActive(p: Product) {
    await api.patch(`/products/${p.id}/active`, { isActive: !p.isActive });
    load();
  }

  return (
    <div>
      <h2>Catálogo de productos</h2>

      <form className="stacked-form" onSubmit={submit}>
        <div className="inline-form">
          <input placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input
            placeholder="Categoría"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            placeholder="Presentación (opcional)"
            value={form.presentation}
            onChange={(e) => setForm({ ...form, presentation: e.target.value })}
          />
          <select value={form.storageArea} onChange={(e) => setForm({ ...form, storageArea: e.target.value as StorageArea })}>
            <option value="REFRIGERADOR">Refrigerador</option>
            <option value="ALMACEN">Almacén</option>
          </select>
          <input
            type="number"
            placeholder="Orden"
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
          />
        </div>
        <div className="branch-checkboxes">
          <span>Sucursales:</span>
          {branches.map((b) => (
            <label key={b.id} className="checkbox-chip">
              <input type="checkbox" checked={form.branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} />
              {b.name}
            </label>
          ))}
        </div>
        <div>
          <button className="btn btn-primary btn-sm" type="submit">
            {editing ? 'Guardar cambios' : 'Agregar producto'}
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
            <th>Categoría</th>
            <th>Área</th>
            <th>Orden</th>
            <th>Sucursales</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name} {p.presentation ? `(${p.presentation})` : ''}
              </td>
              <td>{p.category}</td>
              <td>{p.storageArea === 'REFRIGERADOR' ? 'Refrigerador' : 'Almacén'}</td>
              <td>{p.displayOrder}</td>
              <td>{p.branchAssignments?.length ?? 0}</td>
              <td>{p.isActive ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button className="btn btn-xs" onClick={() => edit(p)}>
                  Editar
                </button>
                <button className="btn btn-xs" onClick={() => toggleActive(p)}>
                  {p.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
