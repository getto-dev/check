'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatasetCategory, DatasetIndexEntry, ProfessionDataset } from './dataset';
import { fetchProfessionDataset, fetchDatasetIndex } from './dataset-loader';
import { readCachedDataset, writeCachedDataset } from './dataset-cache';
import type { CatalogItem } from './types';

const PROFILE_ID = 'plumbing';
const MANIFEST_PATH = `${PROFILE_ID}/manifest.json`;

export function useProfessionDataset() {
  const [dataset, setDataset] = useState<ProfessionDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyCachedDataset = async () => {
      const cached = await readCachedDataset(PROFILE_ID);
      if (!cached || cancelled) return null;

      setDataset(cached);
      setLoading(false);
      return cached;
    };

    const load = async () => {
      const cached = await applyCachedDataset();

      try {
        const index = await fetchDatasetIndex();
        const entry: DatasetIndexEntry | undefined = index.profiles.find(
          (profile) => profile.id === PROFILE_ID,
        );
        if (!entry) throw new Error('Профиль сантехники не найден');

        const cachedIsCurrent = Boolean(
          cached
          && cached.version === entry.version
          && (entry.itemCount === undefined || cached.items.length === entry.itemCount),
        );

        if (cachedIsCurrent) {
          return;
        }

        const remote = await fetchProfessionDataset(entry.manifest || MANIFEST_PATH);
        if (cancelled) return;

        setDataset(remote);
        setError(null);
        setLoading(false);
        await writeCachedDataset(remote);
      } catch (loadError) {
        if (cancelled) return;
        if (cached) {
          setError(null);
          setLoading(false);
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить каталог');
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogItems = useMemo<CatalogItem[]>(
    () => dataset?.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      unit: item.unit,
      priceKopecks: item.priceKopecks,
      categoryId: item.categoryId,
    })) ?? [],
    [dataset],
  );

  const categories = useMemo<DatasetCategory[]>(() => dataset?.categories ?? [], [dataset]);

  return { dataset, catalogItems, categories, loading, error };
}
