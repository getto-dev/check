import { InvoiceItem, Totals } from './types';

/**
 * Format number as Russian Ruble currency
 * @param value - The number to format
 * @param showZeroAsText - If true, returns 'по факту' for zero values
 */
export const formatCurrency = (value: number, showZeroAsText = false): string => {
  if (showZeroAsText && value === 0) return 'по факту';
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
};

/**
 * Format quantity for display — removes trailing zeros from decimals.
 * Examples: 1 → "1", 1.5 → "1.5", 2.50 → "2.5", 0.5 → "0.5"
 */
export const formatQuantity = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  // Remove trailing zeros: 1.50 → 1.5, 2.00 → 2
  const fixed = value.toFixed(2);
  return parseFloat(fixed).toString();
};

/**
 * Calculate invoice totals
 * @param items - Array of invoice items
 * @param discountPercent - Discount percentage for services
 */
export const calculateTotals = (
  items: InvoiceItem[],
  discountPercent: number
): Totals => {
  const services = items.filter((i) => i.type === 'service');
  const products = items.filter((i) => i.type === 'product');
  
  const subtotalServices = services.reduce((sum, i) => sum + i.amount, 0);
  const subtotalProducts = products.reduce((sum, i) => sum + i.amount, 0);
  const discountAmount = Math.round(subtotalServices * (discountPercent / 100));
  const grandTotal = subtotalServices - discountAmount + subtotalProducts;
  
  return {
    subtotalServices,
    subtotalProducts,
    discountAmount,
    grandTotal,
  };
};
