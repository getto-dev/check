export interface CatalogItem {
  id: string;
  n: string;
  d: string;
  u: string;
  p: number;
  catId: string;
}

export interface InvoiceItem {
  id: number;
  catalogId?: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  type: 'service' | 'product';
  category: string;
  amount: number;
}

export interface Settings {
  address: string;
  discount: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type TabType = 'catalog' | 'invoice' | 'manual' | 'settings';

export interface CompressedItem {
  i: string;
  n: string;
  d: string;
  q: number;
  p: number;
  u: string;
  t: 'service' | 'product';
  c: string;
  a: number;
}

export interface Totals {
  subtotalServices: number;
  subtotalProducts: number;
  discountAmount: number;
  grandTotal: number;
}
