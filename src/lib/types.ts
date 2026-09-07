export type ItemType = 'service' | 'product';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  unit: string;
  priceKopecks: number;
  categoryId: string;
}

export interface InvoiceItem {
  id: string;
  catalogId?: string;
  name: string;
  description: string;
  quantity: number;
  priceKopecks: number;
  unit: string;
  type: ItemType;
  categoryId: string;
}

export interface Settings {
  address: string;
  discountPercent: number;
}

export interface Totals {
  servicesKopecks: number;
  productsKopecks: number;
  discountKopecks: number;
  grandTotalKopecks: number;
}

export interface EstimateFileV1 {
  version: 1;
  app: 'santeh-schet';
  name: string;
  items: Array<{
    id: string;
    catalogId?: string;
    name: string;
    description: string;
    quantity: number;
    priceKopecks: number;
    unit: string;
    type: ItemType;
    categoryId: string;
  }>;
  settings: Settings;
  savedAt: number;
}
