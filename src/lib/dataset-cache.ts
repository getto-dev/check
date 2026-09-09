'use client';

import type { ProfessionDataset } from './dataset';

const DB_NAME = 'check-datasets';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';
const LEGACY_PREFIX = 'santeh-schet:dataset:';

interface CachedDatasetRecord {
  key: string;
  dataset: ProfessionDataset;
  cachedAt: number;
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    reject(new Error('IndexedDB is not available'));
    return;
  }

  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = () => reject(request.error ?? new Error('Unable to open dataset cache'));
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'key' });
    }
  };
});

const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onerror = () => reject(request.error ?? new Error('Dataset cache request failed'));
      request.onsuccess = () => resolve(request.result);
    });
  } finally {
    database.close();
  }
};

export async function readCachedDataset(profileId: string): Promise<ProfessionDataset | null> {
  try {
    const record = await withStore<CachedDatasetRecord | undefined>('readonly', (store) => store.get(profileId));
    if (record?.dataset) return record.dataset;
  } catch {
    // Fall back to the pre-IndexedDB cache so existing installations keep working.
  }

  if (typeof window === 'undefined') return null;
  try {
    const legacy = window.localStorage.getItem(`${LEGACY_PREFIX}${profileId}`);
    if (!legacy) return null;
    const dataset = JSON.parse(legacy) as ProfessionDataset;
    if (!dataset || dataset.schemaVersion !== 1 || dataset.id !== profileId) return null;
    if (!Array.isArray(dataset.items) || !Array.isArray(dataset.categories)) return null;

    try {
      await writeCachedDataset(dataset);
      window.localStorage.removeItem(`${LEGACY_PREFIX}${profileId}`);
    } catch {
      // Keeping the legacy entry is safer than deleting it when migration fails.
    }
    return dataset;
  } catch {
    return null;
  }
}

export async function writeCachedDataset(dataset: ProfessionDataset): Promise<void> {
  try {
    await withStore<IDBValidKey>('readwrite', (store) => store.put({
      key: dataset.id,
      dataset,
      cachedAt: Date.now(),
    } satisfies CachedDatasetRecord));
  } catch {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(`${LEGACY_PREFIX}${dataset.id}`, JSON.stringify(dataset));
    } catch {
      // Caching is an optimization; the live dataset remains usable without it.
    }
  }
}
