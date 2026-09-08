import { describe, expect, test } from 'bun:test';
import { loadEstimateFromFile, serializeEstimate } from './estimate-format';
import type { InvoiceItem, Settings } from './types';

const items: InvoiceItem[] = [{ id: 'abc', name: 'Монтаж радиатора', description: 'Описание <тест>', quantity: 1.5, priceKopecks: 123456, unit: 'шт', type: 'service', categoryId: 'heating' }];
const settings: Settings = { address: 'ул. Тестовая <1>', discount: 7, discountPercent: 7 };

test('serialized estimate contains versioned JSON and escaped HTML', () => {
  const html = serializeEstimate(items, settings, 'Дом <1>');
  expect(html).toContain('id="estimate-data"');
  expect(html).toContain('Описание \\u003cтест\\u003e');
  expect(html).toContain('"version":1');
});

describe('estimate format', () => {
  test('rejects unsupported versions', async () => {
    const file = new File(['<script id="estimate-data">{"version":99,"app":"santeh-schet"}</script>'], 'bad.html', { type: 'text/html' });
    await expect(loadEstimateFromFile(file)).rejects.toThrow('Неподдерживаемая версия файла');
  });

  test('accepts serialized estimate', async () => {
    const file = new File([serializeEstimate(items, settings, 'Дом')], 'estimate.html', { type: 'text/html' });
    const loaded = await loadEstimateFromFile(file);
    expect(loaded.items).toEqual(items);
    expect(loaded.settings.discount).toBe(7);
  });
});
