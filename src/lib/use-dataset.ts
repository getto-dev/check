'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatasetCategory, DatasetIndexEntry, ProfessionDataset } from './dataset';
import { fetchProfessionDataset, fetchDatasetIndex } from './dataset-loader';
import { readCachedDataset, writeCachedDataset } from './dataset-cache';
import { ACTIVE_PROFILE_KEY, DEFAULT_PROFILE_ID } from './dataset-profiles';
import type { CatalogItem } from './types';

function readActiveProfile(): string {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_ID;
  try {
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE_ID;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

function writeActiveProfile(profileId: string) {
  try {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch {
    // Persisting the selection is optional.
  }
}

export function useProfessionDataset() {
  const [profileId, setProfileIdState] = useState(readActiveProfile);
  const [profiles, setProfiles] = useState<DatasetIndexEntry[]>([]);
  const [dataset, setDataset] = useState<ProfessionDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectProfile = (nextProfileId: string) => {
    if (!nextProfileId || nextProfileId === profileId) return;
    writeActiveProfile(nextProfileId);
    setProfileIdState(nextProfileId);
    setDataset(null);
    setError(null);
    setLoading(true);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let index: Awaited<ReturnType<typeof fetchDatasetIndex>>;
      try {
        index = await fetchDatasetIndex();
        if (cancelled) return;
        setProfiles(index.profiles);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить список профилей');
          setLoading(false);
        }
        return;
      }

      const entry: DatasetIndexEntry | undefined = index.profiles.find((profile) => profile.id === profileId);
      if (!entry) {
        if (profileId !== DEFAULT_PROFILE_ID) {
          writeActiveProfile(DEFAULT_PROFILE_ID);
          if (!cancelled) setProfileIdState(DEFAULT_PROFILE_ID);
          return;
        }
        if (!cancelled) {
          setError('Активный профиль не найден');
          setLoading(false);
        }
        return;
      }

      const cached = await readCachedDataset(profileId);
      if (cached && !cancelled) {
        setDataset(cached);
        setLoading(false);
      }

      try {
        const cachedIsCurrent = Boolean(
          cached
          && cached.version === entry.version
          && (entry.itemCount === undefined || cached.items.length === entry.itemCount),
        );

        if (cachedIsCurrent) return;

        const remote = await fetchProfessionDataset(entry.manifest);
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
  }, [profileId]);

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

  return {
    profileId,
    profiles,
    dataset,
    catalogItems,
    categories,
    loading,
    error,
    selectProfile,
  };
}
