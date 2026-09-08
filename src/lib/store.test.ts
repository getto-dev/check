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
  const item = (quantity: number): InvoiceItem => ({
    id: 'quantity-test',
    name: 'Монтаж радиатора',
    description: '',
    quantity,
    priceKopecks: 400000,
    unit: 'шт',
    type: 'service',
    categoryId: 'service',
  });

  test('does not turn 1 into 1.1 after a minus-plus cycle', () => {
    useAppStore.setState({ items: [item(1)] });

    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(0.9);

    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);

    useAppStore.setState({ items: [] });
  });

  test('changes whole units by one while preserving fractional quantities', () => {
    useAppStore.setState({ items: [item(2)] });

    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(1);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(2);

    useAppStore.setState({ items: [item(0.5)] });
    useAppStore.getState().changeQuantity('quantity-test', -1);
    expect(useAppStore.getState().items[0].quantity).toBe(0.4);
    useAppStore.getState().changeQuantity('quantity-test', 1);
    expect(useAppStore.getState().items[0].quantity).toBe(0.5);

    useAppStore.setState({ items: [] });
  });
});
