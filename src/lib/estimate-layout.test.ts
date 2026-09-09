import { describe, expect, test } from 'bun:test';
import { createEstimateLayout } from './estimate-layout';
import type { InvoiceItem } from './types';

const baseItem: InvoiceItem = {
  id: 'service-1',
  name: 'Монтаж радиатора',
  description: 'Установка',
  quantity: 1,
  priceKopecks: 400000,
  unit: 'шт',
  type: 'service',
  categoryId: 'heating',
};

const settings = { address: '  Объект 1  ', discountPercent: 10 };

describe('estimate layout', () => {
  test('creates deterministic date-based estimate number', () => {
    const layout = createEstimateLayout([baseItem], settings, new Date('2026-09-09T10:20:30Z'));
    expect(layout.number).toBe('260909-01');
  });

  test('trims address for rendered layout but preserves item data', () => {
    const layout = createEstimateLayout([baseItem], settings);
    expect(layout.address).toBe('Объект 1');
    expect(layout.items).toEqual([baseItem]);
  });

  test('creates service and product sections only when populated', () => {
    const service = createEstimateLayout([baseItem], settings);
    expect(service.sections).toEqual([{ type: 'service', title: 'Наименование работ и услуг', items: [baseItem] }]);
    expect(service.showSectionSummary).toBe(false);

    const product: InvoiceItem = { ...baseItem, id: 'product-1', type: 'product', unit: 'м²', quantity: 2 };
    const both = createEstimateLayout([baseItem, product], settings);
    expect(both.sections).toHaveLength(2);
    expect(both.hasBothTypes).toBe(true);
    expect(both.showSectionSummary).toBe(true);
  });

  test('clamps discount to the application limit', () => {
    expect(createEstimateLayout([baseItem], { address: '', discountPercent: 999 }).discountPercent).toBe(50);
    expect(createEstimateLayout([baseItem], { address: '', discountPercent: -1 }).discountPercent).toBe(0);
  });

  test('handles an empty estimate without sections', () => {
    const layout = createEstimateLayout([], { address: '', discountPercent: 0 });
    expect(layout.sections).toEqual([]);
    expect(layout.services).toEqual([]);
    expect(layout.products).toEqual([]);
    expect(layout.hasServices).toBe(false);
    expect(layout.hasProducts).toBe(false);
    expect(layout.showSectionSummary).toBe(false);
    expect(layout.totals.grandTotalKopecks).toBe(0);
  });
});
