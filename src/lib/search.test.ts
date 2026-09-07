import { describe, expect, test } from 'bun:test';
import { searchCatalog, tokenizeQuery } from './search';
import { CATALOG } from './catalog';

describe('search', () => {
  test('normalizes Russian query words', () => expect(tokenizeQuery('монтаж радиатора')).toEqual(['монтаж','радиат']));
  test('ranks name matches above unrelated descriptions', () => {
    const result = searchCatalog(CATALOG, 'радиатор');
    expect(result[0]?.name).toContain('радиатор');
  });
});
