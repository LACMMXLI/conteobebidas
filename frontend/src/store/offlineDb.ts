import Dexie, { type Table } from 'dexie';

/**
 * Cola de autoguardado local. Cada edición de un producto se escribe aquí
 * de inmediato (antes de intentar la red) para no perder información si la
 * app se cierra o la conexión falla momentáneamente. Un worker en segundo
 * plano reintenta enviar los cambios pendientes al servidor.
 */
export interface PendingEdit {
  key: string; // `${countId}:${productId}`
  countId: string;
  productId: string;
  opening?: number;
  entries?: number;
  closing?: number;
  updatedAt: number;
  synced: boolean;
}

class OfflineDb extends Dexie {
  pendingEdits!: Table<PendingEdit, string>;

  constructor() {
    super('conteo-offline');
    this.version(1).stores({
      pendingEdits: 'key, countId, synced',
    });
  }
}

export const offlineDb = new OfflineDb();

export async function saveLocalEdit(
  countId: string,
  productId: string,
  values: { opening?: number; entries?: number; closing?: number },
) {
  const key = `${countId}:${productId}`;
  const existing = await offlineDb.pendingEdits.get(key);
  await offlineDb.pendingEdits.put({
    key,
    countId,
    productId,
    opening: values.opening ?? existing?.opening,
    entries: values.entries ?? existing?.entries,
    closing: values.closing ?? existing?.closing,
    updatedAt: Date.now(),
    synced: false,
  });
}

export async function markSynced(key: string) {
  await offlineDb.pendingEdits.update(key, { synced: true });
}

export async function getPendingForCount(countId: string) {
  return offlineDb.pendingEdits.where({ countId }).and((e) => !e.synced).toArray();
}
