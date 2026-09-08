import { describe, expect, test } from 'bun:test';
import { calculateTotals } from './format';
import type { InvoiceItem } from './types';

const items: InvoiceItem[] = [
  { id: '1', name: 'Работа', description: '', quantity: 2, priceKopecks: 100000, unit: 'шт', type: 'service', categoryId: 'service' },
  { id: '2', name: 'Материал', description: '', quantity: 3, priceKopecks: 50000, unit: 'шт', type: 'product', categoryId: 'water' },
];

describe('calculateTotals', () => {
  test('calculates services, products and discount in kopecks', () => {
    const totals = calculateTotals(items, 10);
    expect(totals.servicesKopecks).toBe(200000);
    expect(totals.productsKopecks).toBe(150000);
    expect(totals.discountKopecks).toBe(20000);
    expect(totals.grandTotalKopecks).toBe(330000);
  });

  test('clamps discounts to the application limit', () => {
    expect(calculateTotals(items, 150).grandTotalKopecks).toBe(250000);
    expect(calculateTotals(items, -10).grandTotalKopecks).toBe(350000);
  });
});
