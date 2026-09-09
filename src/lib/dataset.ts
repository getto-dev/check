export interface DatasetCategory {
  id: string;
  name: string;
}

export interface DatasetItem {
  id: string;
  name: string;
  description?: string;
  unit: string;
  priceKopecks: number;
  categoryId: string;
  type?: 'service' | 'material';
}

export interface DatasetConfig {
  defaultUnit?: string;
  supportedUnits?: string[];
  features?: Record<string, boolean>;
}

export interface ProfessionDataset {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  locale: string;
  currency: string;
  categories: DatasetCategory[];
  items: DatasetItem[];
  synonyms?: unknown;
  config?: DatasetConfig;
}

export interface DatasetIndexEntry {
  id: string;
  name: string;
  version: string;
  manifest: string;
}

export interface DatasetIndex {
  schemaVersion: number;
  profiles: DatasetIndexEntry[];
}
