import { describe, expect, test } from 'bun:test';
import { searchCatalog, tokenizeQuery } from './search';
import { CATALOG } from './catalog';

describe('search', () => {
  test('normalizes Russian query words', () => {
    expect(tokenizeQuery('монтаж радиатора')).toContain('монтаж');
    expect(tokenizeQuery('монтаж радиатора')).toContain('радиатор');
  });

  test('returns the full catalog when query is empty', () => {
    const all = Object.values(CATALOG).reduce((sum, items) => sum + items.length, 0);
    expect(searchCatalog(CATALOG, '')).toHaveLength(all);
  });

  test('finds dimension-specific plumbing services', () => {
    const result = searchCatalog(CATALOG, 'труба 110');
    expect(result.some((item) => item.name.includes('110'))).toBe(true);
  });
});
