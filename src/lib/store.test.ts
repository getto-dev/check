import { describe, expect, test } from 'bun:test';
import { calculateTotals } from './format';
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

  test('clamps discounts to the application limit', () => {
    expect(calculateTotals(items, 150).grandTotalKopecks).toBe(250000);
    expect(calculateTotals(items, -10).grandTotalKopecks).toBe(350000);
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

  test('keeps piece-counted items whole', () => {
    useAppStore.setState({ items: [item(1)] });

    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);

    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(2);

    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);

    useAppStore.setState({ items: [] });
  });

  test('preserves reversible fractional quantities for measurable units', () => {
    useAppStore.setState({ items: [item(1, 'м²')] });

    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(0.9);

    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);

    useAppStore.setState({ items: [item(2, 'м²')] });
    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(2);

    useAppStore.setState({ items: [item(0.5, 'м²')] });
    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(0.4);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(0.5);

    useAppStore.setState({ items: [] });
  });
});
