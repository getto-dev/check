import type { DatasetIndex, DatasetSynonyms, ProfessionDataset } from './dataset';

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
    itemCount?: number;
    files: {
      catalog: string;
      categories: string;
      synonyms?: string;
      config?: string;
    };
  }>(new URL(manifestPath, DATASET_BASE_URL).toString());
}

function validateSynonyms(value: unknown): DatasetSynonyms | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object') throw new Error('Invalid synonyms structure');

  const synonyms = value as { schemaVersion?: unknown; groups?: unknown };
  if (synonyms.schemaVersion !== 1 || !Array.isArray(synonyms.groups)) {
    throw new Error('Unsupported or invalid synonyms schema');
  }

  for (const group of synonyms.groups) {
    if (!Array.isArray(group) || group.length < 2 || group.some((term) => typeof term !== 'string' || !term.trim())) {
      throw new Error('Invalid synonyms group');
    }
  }

  return {
    schemaVersion: 1,
    groups: synonyms.groups as string[][],
  };
}

function validateDataset(dataset: ProfessionDataset) {
  if (dataset.schemaVersion !== 1) throw new Error('Unsupported dataset schema version');
  if (!dataset.id || !dataset.name || !dataset.version || !dataset.locale || !dataset.currency) {
    throw new Error('Invalid dataset metadata');
  }
  if (!Array.isArray(dataset.categories) || !Array.isArray(dataset.items)) {
    throw new Error('Invalid dataset structure');
  }
  if (dataset.itemCount !== undefined && dataset.itemCount !== dataset.items.length) {
    throw new Error(`Dataset item count mismatch: ${dataset.items.length}/${dataset.itemCount}`);
  }

  const categoryIds = new Set<string>();
  for (const category of dataset.categories) {
    if (!category.id || !category.name || categoryIds.has(category.id)) {
      throw new Error(`Invalid or duplicate category: ${category.id}`);
    }
    categoryIds.add(category.id);
  }

  const itemIds = new Set<string>();
  for (const item of dataset.items) {
    if (!item.id || itemIds.has(item.id)) throw new Error(`Invalid or duplicate item id: ${item.id}`);
    if (!item.name || !item.unit || !Number.isInteger(item.priceKopecks) || item.priceKopecks < 0) {
      throw new Error(`Invalid catalog item: ${item.id}`);
    }
    if (!categoryIds.has(item.categoryId)) {
      throw new Error(`Unknown category ${item.categoryId} for ${item.id}`);
    }
    if (item.type !== undefined && item.type !== 'service' && item.type !== 'material') {
      throw new Error(`Invalid item type for ${item.id}`);
    }
    itemIds.add(item.id);
  }

  return dataset;
}

export async function fetchProfessionDataset(
  manifestPath: string,
): Promise<ProfessionDataset> {
  const manifest = await fetchDatasetManifest(manifestPath);
  const baseUrl = new URL(manifestPath, DATASET_BASE_URL);
  baseUrl.pathname = baseUrl.pathname.replace(/[^/]+$/, '');

  const [catalog, categories, synonyms, config] = await Promise.all([
    fetchJson<{ schemaVersion: number; items: ProfessionDataset['items'] }>(
      new URL(manifest.files.catalog, baseUrl).toString(),
    ),
    fetchJson<{ schemaVersion: number; categories: ProfessionDataset['categories'] }>(
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

  if (catalog.schemaVersion !== 1 || categories.schemaVersion !== 1) {
    throw new Error('Unsupported dataset file schema version');
  }

  return validateDataset({
    ...manifest,
    itemCount: manifest.itemCount,
    categories: categories.categories,
    items: catalog.items,
    synonyms: validateSynonyms(synonyms),
    config,
  });
}
