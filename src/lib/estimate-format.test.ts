import { describe, expect, test } from 'bun:test';
import { loadEstimateFromFile, serializeEstimate } from './estimate-format';
import { createEstimateLayout } from './estimate-layout';
import type { InvoiceItem, Settings } from './types';

const items: InvoiceItem[] = [{ id: 'abc', name: 'Монтаж радиатора', description: 'Описание <тест>', quantity: 1.5, priceKopecks: 123456, unit: 'шт', type: 'service', categoryId: 'heating' }];
const settings: Settings = { address: 'ул. Тестовая <1>', discountPercent: 7 };

test('serialized estimate contains versioned JSON and escaped HTML', async () => {
  const html = await serializeEstimate(items, settings, 'Дом <1>');
  expect(html).toContain('id="estimate-data"');
  expect(html).toContain('Описание \\u003cтест\\u003e');
  expect(html).toContain('"version":1');
  expect(html).toContain('@font-face');
  expect(html).toContain('СЧЕТ №');
  expect(html).toContain('Наименование работ и услуг');
});

describe('estimate format', () => {
  test('rejects unsupported versions', async () => {
    const file = new File(['<script id="estimate-data">{"version":99,"app":"santeh-schet"}</script>'], 'bad.html', { type: 'text/html' });
    await expect(loadEstimateFromFile(file)).rejects.toThrow('Неподдерживаемая версия файла');
  });

  test('accepts serialized estimate', async () => {
    const file = new File([await serializeEstimate(items, settings, 'Дом')], 'estimate.html', { type: 'text/html' });
    const loaded = await loadEstimateFromFile(file);
    expect(loaded.items).toEqual(items);
    expect(loaded.settings.discountPercent).toBe(7);
  });

  test('shows section totals only when both item types exist', () => {
    const onlyServices = createEstimateLayout(items, settings);
    expect(onlyServices.showSectionSummary).toBe(false);
    const both = createEstimateLayout([...items, { ...items[0], id: 'product', type: 'product' }], settings);
    expect(both.showSectionSummary).toBe(true);
  });
});
