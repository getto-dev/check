import { describe, expect, test } from 'bun:test';
import { calculateTotals, formatCurrency, formatQuantity } from './format';
import type { InvoiceItem } from './types';

describe('formatCurrency', () => {
  test('formats kopecks as Russian rubles', () => {
    expect(formatCurrency(0)).toContain('0 ₽');
    expect(formatCurrency(123456)).toBe('1 235 ₽');
  });

  test('rounds fractional kopecks to whole displayed rubles', () => {
    expect(formatCurrency(1234.4)).toBe('12 ₽');
    expect(formatCurrency(1234.6)).toBe('12 ₽');
  });
});

describe('formatQuantity', () => {
  test('keeps integers without decimals', () => {
    expect(formatQuantity(1)).toBe('1');
    expect(formatQuantity(4)).toBe('4');
  });

  test('rounds displayed fractions to two decimals', () => {
    expect(formatQuantity(0.9)).toBe('0.9');
    expect(formatQuantity(1.234)).toBe('1.23');
  });
});

describe('calculateTotals edge cases', () => {
  const item = (overrides: Partial<InvoiceItem>): InvoiceItem => ({
    id: 'test',
    name: 'Позиция',
    description: '',
    quantity: 1,
    priceKopecks: 10000,
    unit: 'шт',
    type: 'service',
    categoryId: 'test',
    ...overrides,
  });

  test('returns zero totals for an empty estimate', () => {
    expect(calculateTotals([], 0)).toEqual({
      servicesKopecks: 0,
      productsKopecks: 0,
      discountKopecks: 0,
      grandTotalKopecks: 0,
    });
  });

  test('treats NaN discount as zero and clamps Infinity', () => {
    expect(calculateTotals([item({ quantity: 2 })], Number.NaN).grandTotalKopecks).toBe(20000);
    expect(calculateTotals([item({ quantity: 2 })], Number.POSITIVE_INFINITY).grandTotalKopecks).toBe(10000);
  });

  test('rounds line totals in kopecks', () => {
    const totals = calculateTotals([
      item({ priceKopecks: 101, quantity: 0.5 }),
      item({ id: 'product', type: 'product', priceKopecks: 99, quantity: 1.5 }),
    ], 10);
    expect(totals.servicesKopecks).toBe(51);
    expect(totals.productsKopecks).toBe(149);
    expect(totals.discountKopecks).toBe(5);
    expect(totals.grandTotalKopecks).toBe(195);
  });
});
