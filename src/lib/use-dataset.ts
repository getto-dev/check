'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  const selectProfile = useCallback((nextProfileId: string) => {
    if (!nextProfileId || nextProfileId === profileId) return;
    writeActiveProfile(nextProfileId);
    setProfileIdState(nextProfileId);
    setDataset(null);
    setError(null);
    setUpdateAvailable(false);
    setLoading(true);
  }, [profileId]);

  const findActiveEntry = useCallback((index: Awaited<ReturnType<typeof fetchDatasetIndex>>) => (
    index.profiles.find((profile) => profile.id === profileId)
  ), [profileId]);

  const checkForDatasetUpdate = useCallback(async () => {
    if (!navigator.onLine) throw new Error('Нет подключения к интернету');
    setCheckingUpdate(true);
    try {
      const index = await fetchDatasetIndex();
      setProfiles(index.profiles);
      const entry = findActiveEntry(index);
      if (!entry) throw new Error('Активный профиль не найден');
      const available = Boolean(
        dataset
        && (dataset.version !== entry.version || (entry.itemCount !== undefined && dataset.items.length !== entry.itemCount)),
      );
      setUpdateAvailable(available);
      return available;
    } finally {
      setCheckingUpdate(false);
    }
  }, [dataset, findActiveEntry]);

  const updateDataset = useCallback(async () => {
    if (!navigator.onLine) throw new Error('Нет подключения к интернету');
    setUpdating(true);
    try {
      const index = await fetchDatasetIndex();
      setProfiles(index.profiles);
      const entry = findActiveEntry(index);
      if (!entry) throw new Error('Активный профиль не найден');
      const remote = await fetchProfessionDataset(entry.manifest);
      if (remote.id !== profileId) throw new Error('Получен каталог другого профиля');
      setDataset(remote);
      setError(null);
      setUpdateAvailable(false);
      await writeCachedDataset(remote);
      return remote;
    } finally {
      setUpdating(false);
    }
  }, [findActiveEntry, profileId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Load the cached profile first. This is what makes a previously opened
      // catalog usable after a full page reload with no network connection.
      const cached = await readCachedDataset(profileId);
      if (cached && !cancelled) {
        setDataset(cached);
        setError(null);
        setLoading(false);
      }

      let index: Awaited<ReturnType<typeof fetchDatasetIndex>>;
      try {
        index = await fetchDatasetIndex();
        if (cancelled) return;
        setProfiles(index.profiles);
      } catch (loadError) {
        if (!cancelled && cached) {
          setUpdateAvailable(true);
          setError(null);
          setLoading(false);
        } else if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить список профилей');
          setLoading(false);
        }
        return;
      }

      const entry = index.profiles.find((profile) => profile.id === profileId);
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

      try {
        const cachedIsCurrent = Boolean(
          cached
          && cached.version === entry.version
          && (entry.itemCount === undefined || cached.items.length === entry.itemCount),
        );

        if (cachedIsCurrent) {
          if (!cancelled) setUpdateAvailable(false);
          return;
        }

        const remote = await fetchProfessionDataset(entry.manifest);
        if (cancelled) return;
        setDataset(remote);
        setError(null);
        setUpdateAvailable(false);
        setLoading(false);
        await writeCachedDataset(remote);
      } catch (loadError) {
        if (cancelled) return;
        if (cached) {
          setUpdateAvailable(true);
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
      type: item.type === 'material' ? 'product' : 'service',
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
    updateAvailable,
    checkingUpdate,
    updating,
    selectProfile,
    checkForDatasetUpdate,
    updateDataset,
  };
}
