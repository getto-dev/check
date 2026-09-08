import { describe, expect, test } from 'bun:test';
import { calculateTotals } from './format';
import { createEstimateLayout } from './estimate-layout';
import {
  EstimateFileError,
  loadEstimateFromFile,
  serializeEstimate,
} from './estimate-format';
import type { InvoiceItem, Settings } from './types';

const items: InvoiceItem[] = [
  {
    id: 'service-1',
    name: 'Монтаж смесителя',
    description: 'Демонтаж старого смесителя и установка нового',
    quantity: 2,
    priceKopecks: 125050,
    unit: 'шт',
    type: 'service',
    categoryId: 'service',
    catalogId: 'catalog-1',
  },
  {
    id: 'product-1',
    name: 'Смеситель латунный',
    description: 'Комплект поставки',
    quantity: 1.5,
    priceKopecks: 99099,
    unit: 'шт',
    type: 'product',
    categoryId: 'water',
    catalogId: 'catalog-2',
  },
];

const settings: Settings = {
  address: '  Москва, ул. Тестовая, дом 10  ',
  discountPercent: 17,
};

const extractJson = (html: string) => {
  const match = html.match(/<script[^>]*id=["']estimate-data["'][^>]*>([\\s\\S]*?)<\\/script>/i);
  expect(match?.[1]).toBeTruthy();
  return JSON.parse(match![1].replaceAll('<\\/script', '</script').replaceAll('<\\!--', '<!--'));
};

describe('estimate integration', () => {
  test('keeps totals consistent across calculator, layout and serialized estimate', async () => {
    const totals = calculateTotals(items, settings.discountPercent);
    const layout = createEstimateLayout(items, settings, new Date('2026-09-09T10:20:30Z'));
    const html = await serializeEstimate(items, settings, 'Объект №1');
    const data = extractJson(html);

    expect(layout.totals).toEqual(totals);
    expect(layout.services).toHaveLength(1);
    expect(layout.products).toHaveLength(1);
    expect(layout.showSectionSummary).toBe(true);
    expect(layout.address).toBe('Москва, ул. Тестовая, дом 10');
    expect(layout.number).toBe('260909-01');

    expect(data).toMatchObject({
      version: 1,
      app: 'santeh-schet',
      name: 'Объект №1',
      items,
      settings,
    });
  });

  test('round-trips a generated estimate through the real file importer', async () => {
    const html = await serializeEstimate(items, settings, 'Моя смета');
    const file = new File([html], 'estimate.html', { type: 'text/html' });
    const imported = await loadEstimateFromFile(file);

    expect(imported).toEqual({
      version: 1,
      app: 'santeh-schet',
      name: 'Моя смета',
      items,
      settings: {
        address: settings.address,
        discountPercent: settings.discountPercent,
      },
      savedAt: expect.any(Number),
    });
  });

  test('normalizes whitespace and clamps imported discounts without changing items', async () => {
    const html = await serializeEstimate(items, { ...settings, discountPercent: 17 }, 'Смета');
    const data = extractJson(html);
    data.settings.address = '  Объект 42   ';
    data.settings.discountPercent = 999;

    const editedHtml = html.replace(
      /(<script[^>]*id=["']estimate-data["'][^>]*>)[\\s\\S]*?(<\\/script>)/i,
      `$1${JSON.stringify(data)}$2`,
    );
    const imported = await loadEstimateFromFile(new File([editedHtml], 'estimate.html'));

    expect(imported.settings).toEqual({
      address: '  Объект 42   ',
      discountPercent: 50,
    });
    expect(imported.items).toEqual(items);
  });

  test('rejects malformed, wrong-app and invalid-item estimates', async () => {
    const makeFile = (value: unknown) => new File([
      `<!doctype html><script id="estimate-data" type="application/json">${JSON.stringify(value)}</script>`,
    ], 'estimate.html');

    await expect(loadEstimateFromFile(makeFile({ version: 2, app: 'santeh-schet' }))).rejects.toThrow(EstimateFileError);
    await expect(loadEstimateFromFile(makeFile({ version: 1, app: 'other-app' }))).rejects.toThrow('Неподдерживаемая версия файла');
    await expect(loadEstimateFromFile(makeFile({
      version: 1,
      app: 'santeh-schet',
      items: [{ ...items[0], quantity: 0 }],
      settings,
    }))).rejects.toThrow('Список позиций сметы повреждён');
  });

  test('escapes HTML-sensitive content while preserving the original data on import', async () => {
    const dangerous: InvoiceItem = {
      ...items[0],
      id: 'dangerous',
      name: '<img src=x onerror="alert(1)">',
      description: `</script><script>alert('xss')</script><!--`,
    };
    const dangerousSettings: Settings = {
      address: '<b>Клиент</b> & объект',
      discountPercent: 10,
    };
    const html = await serializeEstimate([dangerous], dangerousSettings, '<Смета>');

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;Смета&gt;');

    const imported = await loadEstimateFromFile(new File([html], 'estimate.html'));
    expect(imported.items[0].name).toBe(dangerous.name);
    expect(imported.items[0].description).toBe(dangerous.description);
    expect(imported.settings).toEqual(dangerousSettings);
  });

  test('supports service-only and product-only estimates without misleading section summaries', () => {
    const serviceOnly = createEstimateLayout([items[0]], settings);
    const productOnly = createEstimateLayout([items[1]], settings);

    expect(serviceOnly.sections).toHaveLength(1);
    expect(serviceOnly.sections[0].type).toBe('service');
    expect(serviceOnly.showSectionSummary).toBe(false);
    expect(serviceOnly.totals.productsKopecks).toBe(0);

    expect(productOnly.sections).toHaveLength(1);
    expect(productOnly.sections[0].type).toBe('product');
    expect(productOnly.showSectionSummary).toBe(false);
    expect(productOnly.totals.servicesKopecks).toBe(0);
  });
});
