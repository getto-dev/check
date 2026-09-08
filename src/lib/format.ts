import type { InvoiceItem, Totals } from './types';
import { MAX_DISCOUNT_PERCENT } from './constants';

export const formatCurrency = (kopecks: number) => new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
}).format(Math.round(kopecks) / 100);

export const formatQuantity = (value: number) => Number.isInteger(value)
  ? String(value)
  : String(Number(value.toFixed(2)));

export const calculateTotals = (items: InvoiceItem[], discountPercent: number): Totals => {
  const servicesKopecks = items
    .filter((item) => item.type === 'service')
    .reduce((sum, item) => sum + Math.round(item.priceKopecks * item.quantity), 0);
  const productsKopecks = items
    .filter((item) => item.type === 'product')
    .reduce((sum, item) => sum + Math.round(item.priceKopecks * item.quantity), 0);
  const safeDiscount = Math.max(0, Math.min(MAX_DISCOUNT_PERCENT, Number(discountPercent) || 0));
  const discountKopecks = Math.round(servicesKopecks * safeDiscount / 100);
  const grandTotalKopecks = Math.max(0, servicesKopecks - discountKopecks + productsKopecks);

  return {
    servicesKopecks,
    productsKopecks,
    discountKopecks,
    grandTotalKopecks,
  };
};
