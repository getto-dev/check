import { describe, expect, test } from 'bun:test';
import { serializeEstimate } from './estimate-format';
import type { InvoiceItem, Settings } from './types';

const items: InvoiceItem[] = [{ id: 'abc', name: 'Монтаж радиатора', description: 'Описание <тест>', quantity: 1.5, priceKopecks: 123456, unit: 'шт', type: 'service', categoryId: 'heating' }];
const settings: Settings = { address: 'ул. Тестовая <1>', discountPercent: 7 };

test('serialized estimate contains versioned JSON and escaped HTML', () => {
  const html = serializeEstimate(items, settings, 'Дом <1>');
  expect(html).toContain('id="estimate-data"');
  expect(html).toContain('&lt;тест&gt;');
  expect(html).toContain('"version":1');
});

describe('estimate format', () => {
  test('rejects unsupported versions', () => {
    expect(() => JSON.parse('{"version":99}')).not.toThrow();
  });
});
