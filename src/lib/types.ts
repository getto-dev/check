// Типы для приложения СантехСчет

export interface CatalogItem {
  id: string;
  n: string; // name
  d: string; // description
  u: string; // unit
  p: number; // price
  catId: string; // category id
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

export interface Category {
  id: string;
  name: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type TabType = 'catalog' | 'invoice' | 'manual' | 'settings';

// Сжатый формат для localStorage
export interface CompressedItem {
  i: string; // id (catalogId or generated)
  n: string; // name
  d: string; // description
  q: number; // quantity
  p: number; // price
  u: string; // unit
  t: 'service' | 'product'; // type
  c: string; // category
  a: number; // amount
}

export interface Totals {
  subtotalServices: number;
  subtotalProducts: number;
  discountAmount: number;
  grandTotal: number;
}
