'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatasetCategory, ProfessionDataset } from './dataset';
import { fetchProfessionDataset, fetchDatasetIndex } from './dataset-loader';
import type { CatalogItem } from './types';

const CACHE_KEY = 'santeh-schet:dataset:plumbing';
const MANIFEST_PATH = 'plumbing/manifest.json';

function readCachedDataset(): ProfessionDataset | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfessionDataset;
    if (!parsed || parsed.schemaVersion !== 1 || parsed.id !== 'plumbing') return null;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.categories)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedDataset(dataset: ProfessionDataset) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(dataset));
  } catch {
    // Caching is an optimization; the live dataset remains usable without it.
  }
}

export function useProfessionDataset() {
  const [dataset, setDataset] = useState<ProfessionDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = readCachedDataset();
      if (cached && !cancelled) {
        setDataset(cached);
        setLoading(false);
      }

      try {
        const index = await fetchDatasetIndex();
        const entry = index.profiles.find((profile) => profile.id === 'plumbing');
        if (!entry) throw new Error('Профиль сантехники не найден');

        const remote = await fetchProfessionDataset(entry.manifest || MANIFEST_PATH);
        if (cancelled) return;

        setDataset(remote);
        setError(null);
        setLoading(false);
        writeCachedDataset(remote);
      } catch (loadError) {
        if (cancelled) return;
        if (cached) {
          setError(null);
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить каталог');
        }
        setLoading(false);
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
