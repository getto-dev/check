import { describe, expect, test } from 'bun:test';
import { searchCatalog, tokenizeQuery } from './search';
import type { CatalogItem } from './types';

const ITEMS: CatalogItem[] = [
  { id: 'pipe-20', name: 'Труба Ø20', description: 'Полипропиленовая труба', unit: 'м', priceKopecks: 1000, categoryId: 'pipes' },
  { id: 'pipe-200', name: 'Труба Ø200', description: 'Полипропиленовая труба', unit: 'м', priceKopecks: 2000, categoryId: 'pipes' },
];

describe('search ranking regressions', () => {
  test('treats numeric dimensions as exact values', () => {
    expect(searchCatalog(ITEMS, 'труба 20').map((item) => item.id)).toEqual(['pipe-20']);
  });

  test('keeps compound dimensions as one numeric token', () => {
    expect(tokenizeQuery('труба 20x20')).toEqual(['труб', '20x20']);
  });
});
