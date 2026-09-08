import type { InvoiceItem, Settings, Totals } from './types';
import { calculateTotals } from './format';
import { ESTIMATE_LAYOUT, MAX_DISCOUNT_PERCENT } from './constants';

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
  constants: typeof ESTIMATE_LAYOUT;
}

export function createEstimateLayout(items: InvoiceItem[], settings: Settings, now = new Date()): EstimateLayout {
  const services = items.filter((item) => item.type === 'service');
  const products = items.filter((item) => item.type === 'product');
  const discountPercent = Math.max(0, Math.min(MAX_DISCOUNT_PERCENT, Number(settings.discountPercent) || 0));
  const totals = calculateTotals(items, discountPercent);
  const number = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`;
  const hasServices = services.length > 0;
  const hasProducts = products.length > 0;
  const hasBothTypes = hasServices && hasProducts;
  const sections: EstimateLayoutSection[] = [
    { type: 'service', title: 'Наименование работ и услуг', items: services },
    { type: 'product', title: 'Наименование материалов и товаров', items: products },
  ].filter((section): section is EstimateLayoutSection => section.items.length > 0);

  return {
    number,
    address: settings.address.trim(),
    items,
    services,
    products,
    sections,
    totals,
    discountPercent,
    hasServices,
    hasProducts,
    hasBothTypes,
    showSectionSummary: hasBothTypes,
    constants: ESTIMATE_LAYOUT,
  };
}
