import { describe, expect, test } from 'bun:test';
import { CATALOG } from './catalog';
import { searchCatalog, stem, tokenizeQuery } from './search';

describe('search', () => {
  test('normalizes Russian query words', () => {
    expect(stem('радиатора')).toBe('радиатор');
    expect(tokenizeQuery('монтаж радиатора')).toEqual(['монтаж', 'радиатор']);
  });

  test('ignores stop words and preserves numeric dimensions', () => {
    expect(tokenizeQuery('монтаж на 110')).toEqual(['монтаж', '110']);
  });

  test('returns the full catalog when query is empty', () => {
    const all = Object.values(CATALOG).reduce((sum, items) => sum + items.length, 0);
    expect(searchCatalog(CATALOG, '')).toHaveLength(all);
  });

  test('finds dimension-specific plumbing services', () => {
    const result = searchCatalog(CATALOG, 'труба 110');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.name.includes('110'))).toBe(true);
  });

  test('filters by category', () => {
    const result = searchCatalog(CATALOG, '', 'heating');
    expect(result.length).toBe(CATALOG.heating.length);
    expect(result.every((item) => item.categoryId === 'heating')).toBe(true);
  });

  test('returns no results when any query token is absent', () => {
    expect(searchCatalog(CATALOG, 'радиатор несуществующийterm')).toEqual([]);
  });
});
