import type { InvoiceItem, Settings, Totals } from './types';
import { calculateTotals } from './format';

export interface EstimateLayoutSection {
  type: InvoiceItem['type'];
  title: string;
  items: InvoiceItem[];
}

export interface EstimateLayout {
  number: string;
  address: string;
  items: InvoiceItem[];
  services: InvoiceItem[];
  products: InvoiceItem[];
  sections: EstimateLayoutSection[];
  totals: Totals;
  discountPercent: number;
  hasServices: boolean;
  hasProducts: boolean;
  hasBothTypes: boolean;
  showSectionSummary: boolean;
}

export function createEstimateLayout(items: InvoiceItem[], settings: Settings, now = new Date()): EstimateLayout {
  const services = items.filter((item) => item.type === 'service');
  const products = items.filter((item) => item.type === 'product');
  const totals = calculateTotals(items, settings.discount);
  const number = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`;
  const hasServices = services.length > 0;
  const hasProducts = products.length > 0;
  const hasBothTypes = hasServices && hasProducts;

  return {
    number,
    address: settings.address.trim(),
    items,
    services,
    products,
    sections: [
      { type: 'service', title: 'Наименование работ и услуг', items: services },
      { type: 'product', title: 'Наименование материалов и товаров', items: products },
    ].filter((section) => section.items.length),
    totals,
    discountPercent: settings.discount,
    hasServices,
    hasProducts,
    hasBothTypes,
    showSectionSummary: hasBothTypes,
  };
}
