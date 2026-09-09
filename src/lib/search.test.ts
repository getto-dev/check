import { describe, expect, test } from 'bun:test';
import { searchCatalog, stem, tokenizeQuery } from './search';
import type { CatalogItem } from './types';

const CATALOG_ITEMS: CatalogItem[] = [
  { id: 'heat_001', name: 'Монтаж радиатора', description: 'Сборка и установка радиатора', unit: 'шт', priceKopecks: 400000, categoryId: 'heating' },
  { id: 'sewer_001', name: 'Труба Ø110 на стене', description: 'Прокладка трубы с фиксацией', unit: 'м.п', priceKopecks: 63000, categoryId: 'sewerage' },
  { id: 'sewer_002', name: 'Труба Ø50 на стене', description: 'Прокладка трубы с фиксацией', unit: 'м.п', priceKopecks: 45000, categoryId: 'sewerage' },
  { id: 'plumb_001', name: 'Смеситель', description: 'Установка на раковину', unit: 'шт', priceKopecks: 225000, categoryId: 'plumbing' },
  { id: 'electric_001', name: 'Установка розетки', description: 'Подключение и монтаж розетки', unit: 'шт', priceKopecks: 150000, categoryId: 'electrical' },
];

const SYNONYMS = {
  schemaVersion: 1,
  groups: [
    ['монтаж', 'установка', 'подключение'],
    ['розетка', 'розеточный блок'],
  ],
};

describe('search', () => {
  test('normalizes Russian query words', () => {
    expect(stem('радиатора')).toBe('радиатор');
    expect(tokenizeQuery('монтаж радиатора')).toEqual(['монтаж', 'радиатор']);
  });

  test('ignores stop words and preserves numeric dimensions', () => {
    expect(tokenizeQuery('монтаж на 110')).toEqual(['монтаж', '110']);
  });

  test('returns the full catalog when query is empty', () => {
    expect(searchCatalog(CATALOG_ITEMS, '')).toHaveLength(CATALOG_ITEMS.length);
  });

  test('finds dimension-specific plumbing services', () => {
    const result = searchCatalog(CATALOG_ITEMS, 'труба 110');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toContain('110');
  });

  test('filters by category', () => {
    const result = searchCatalog(CATALOG_ITEMS, '', 'heating');
    expect(result).toHaveLength(1);
    expect(result.every((item) => item.categoryId === 'heating')).toBe(true);
  });

  test('returns no results when any query token is absent', () => {
    expect(searchCatalog(CATALOG_ITEMS, 'радиатор несуществующийterm')).toEqual([]);
  });

  test('uses profile synonyms when searching', () => {
    const result = searchCatalog(CATALOG_ITEMS, 'монтаж розетки', undefined, SYNONYMS);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('electric_001');
  });
});
