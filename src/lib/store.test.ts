import { describe, expect, test } from 'bun:test';
import { calculateTotals } from './format';
import { normalizeQuantity } from './quantity-rules';
import { useAppStore } from './store';
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

  test('clamps discounts to the application limit and handles invalid values as zero', () => {
    expect(calculateTotals(items, 150).grandTotalKopecks).toBe(250000);
    expect(calculateTotals(items, -10).grandTotalKopecks).toBe(350000);
    expect(calculateTotals(items, Number.NaN).grandTotalKopecks).toBe(350000);
  });
});

describe('quantity controls', () => {
  const item = (quantity: number, unit = 'шт'): InvoiceItem => ({
    id: 'quantity-test',
    name: unit === 'шт' ? 'Монтаж радиатора' : 'Монтаж теплого пола (пенофол)',
    description: '',
    quantity,
    priceKopecks: 400000,
    unit,
    type: 'service',
    categoryId: 'service',
  });

  test('uses the same half-unit steps for services and products regardless of unit', () => {
    useAppStore.setState({ items: [item(1, 'шт')] });
    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(1.5);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(2);

    useAppStore.setState({ items: [item(2, 'м²')] });
    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(1.5);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(2);

    useAppStore.setState({ items: [] });
  });

  test('normalizes direct quantity updates to the 0.5 grid and minimum 1', () => {
    useAppStore.setState({ items: [item(2)] });
    useAppStore.getState().updateQuantity('quantity-test', 2.3);
    expect(useAppStore.getState().items[0].quantity).toBe(2.5);
    useAppStore.getState().updateQuantity('quantity-test', 1.2);
    expect(useAppStore.getState().items[0].quantity).toBe(1);
    useAppStore.getState().updateQuantity('quantity-test', -10);
    expect(useAppStore.getState().items[0].quantity).toBe(1);
    useAppStore.getState().updateQuantity('quantity-test', Number.NaN);
    expect(useAppStore.getState().items[0].quantity).toBe(1);

    expect(normalizeQuantity(3.5)).toBe(3.5);
    useAppStore.setState({ items: [] });
  });
});

describe('catalog item insertion', () => {
  const catalogItem = {
    id: 'heat-1',
    name: 'Монтаж радиатора',
    description: '',
    unit: 'шт',
    priceKopecks: 400000,
    categoryId: 'heating',
  };

  test('normalizes quantity to the universal minimum', () => {
    useAppStore.getState().addItem(catalogItem, 0.9);
    expect(useAppStore.getState().items.at(-1)?.quantity).toBe(1);
    useAppStore.getState().addItem(catalogItem, 1.5);
    expect(useAppStore.getState().items.at(-1)?.quantity).toBe(2.5);
    useAppStore.setState({ items: [] });
  });

  test('merges repeated service items with the same catalog item and price', () => {
    useAppStore.getState().addItem(catalogItem, 1);
    useAppStore.getState().addItem(catalogItem, 2);
    expect(useAppStore.getState().items).toHaveLength(1);
    expect(useAppStore.getState().items[0].quantity).toBe(3);
    useAppStore.setState({ items: [] });
  });
});

describe('settings and navigation state', () => {
  test('clamps discount and preserves address', () => {
    useAppStore.getState().updateSettings({ address: '  Тест  ', discountPercent: 75 });
    expect(useAppStore.getState().settings).toEqual({ address: '  Тест  ', discountPercent: 50 });
    useAppStore.getState().updateSettings({ discount: -10 });
    expect(useAppStore.getState().settings.discountPercent).toBe(0);
  });

  test('switches tabs deterministically', () => {
    useAppStore.getState().setTab('invoice');
    expect(useAppStore.getState().currentTab).toBe('invoice');
    useAppStore.getState().setTab('catalog');
    expect(useAppStore.getState().currentTab).toBe('catalog');
  });
});
