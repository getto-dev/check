import { describe, expect, test } from 'bun:test';
import { calculateTotals } from './format';
import type { InvoiceItem } from './types';

const items: InvoiceItem[] = [
  { id: '1', name: 'Работа', description: '', quantity: 2, priceKopecks: 100000, unit: 'шт', type: 'service', categoryId: 'service' },
  { id: '2', name: 'Материал', description: '', quantity: 3, priceKopecks: 50000, unit: 'шт', type: 'product', categoryId: 'water' },
];

describe('calculateTotals', () => {
  test('calculates services, products and discount in kopecks', () => {
    expect(calculateTotals(items, 10)).toEqual({ servicesKopecks: 200000, productsKopecks: 150000, discountKopecks: 20000, grandTotalKopecks: 330000 });
  });
  test('clamps invalid discounts', () => {
    expect(calculateTotals(items, 150).grandTotalKopecks).toBe(150000);
    expect(calculateTotals(items, -10).grandTotalKopecks).toBe(350000);
  });
});
