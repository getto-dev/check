import type { InvoiceItem, Totals } from './types';

export const kopecksToRubles = (value: number): number => value / 100;

export const formatCurrency = (kopecks: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(kopecksToRubles(Math.round(kopecks)));

export const formatQuantity = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

export const calculateTotals = (items: InvoiceItem[], discountPercent: number): Totals => {
  const safeDiscount = Math.min(100, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0));
  const servicesKopecks = items.filter((i) => i.type === 'service')
    .reduce((sum, item) => sum + Math.round(item.quantity * item.priceKopecks), 0);
  const productsKopecks = items.filter((i) => i.type === 'product')
    .reduce((sum, item) => sum + Math.round(item.quantity * item.priceKopecks), 0);
  const discountKopecks = Math.round(servicesKopecks * safeDiscount / 100);
  return {
    servicesKopecks,
    productsKopecks,
    discountKopecks,
    grandTotalKopecks: servicesKopecks - discountKopecks + productsKopecks,
  };
};
