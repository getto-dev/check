import type { DatasetIndex, ProfessionDataset } from './dataset';

export const DATASET_INDEX_URL =
  'https://raw.githubusercontent.com/getto-dev/check-data/main/index.json';

export const DATASET_BASE_URL =
  'https://raw.githubusercontent.com/getto-dev/check-data/main/';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Dataset request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchDatasetIndex(): Promise<DatasetIndex> {
  return fetchJson<DatasetIndex>(DATASET_INDEX_URL);
}

export async function fetchDatasetManifest(manifestPath: string) {
  return fetchJson<{
    schemaVersion: number;
    id: string;
    name: string;
    version: string;
    locale: string;
    currency: string;
    files: {
      catalog: string;
      categories: string;
      synonyms?: string;
      config?: string;
    };
  }>(new URL(manifestPath, DATASET_BASE_URL).toString());
}

export async function fetchProfessionDataset(
  manifestPath: string,
): Promise<ProfessionDataset> {
  const manifest = await fetchDatasetManifest(manifestPath);
  const baseUrl = new URL(manifestPath, DATASET_BASE_URL);
  baseUrl.pathname = baseUrl.pathname.replace(/[^/]+$/, '');

  const [catalog, categories, synonyms, config] = await Promise.all([
    fetchJson<{ items: ProfessionDataset['items'] }>(
      new URL(manifest.files.catalog, baseUrl).toString(),
    ),
    fetchJson<{ categories: ProfessionDataset['categories'] }>(
      new URL(manifest.files.categories, baseUrl).toString(),
    ),
    manifest.files.synonyms
      ? fetchJson<unknown>(new URL(manifest.files.synonyms, baseUrl).toString())
      : Promise.resolve(undefined),
    manifest.files.config
      ? fetchJson<ProfessionDataset['config']>(
          new URL(manifest.files.config, baseUrl).toString(),
        )
      : Promise.resolve(undefined),
  ]);

  return {
    ...manifest,
    categories: categories.categories,
    items: catalog.items,
    synonyms,
    config,
  };
}
