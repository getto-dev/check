import { describe, expect, test } from 'bun:test';
import { CATALOG, CATEGORIES } from './catalog';

describe('catalog integrity', () => {
  const allItems = Object.entries(CATALOG).flatMap(([categoryId, items]) => items.map((item) => ({ ...item, categoryId })));

  test('contains every declared category', () => {
    expect(Object.keys(CATALOG).sort()).toEqual(CATEGORIES.map((category) => category.id).sort());
  });

  test('contains at least 200 catalog positions', () => {
    expect(allItems.length).toBeGreaterThanOrEqual(200);
  });

  test('has unique item ids', () => {
    const ids = allItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('has valid raw catalog fields', () => {
    expect(allItems.every((item) => typeof item.n === 'string' && item.n.trim().length > 0)).toBe(true);
    expect(allItems.every((item) => typeof item.d === 'string' && item.d.trim().length > 0)).toBe(true);
    expect(allItems.every((item) => typeof item.u === 'string' && item.u.trim().length > 0)).toBe(true);
    expect(allItems.every((item) => Number.isFinite(item.p) && item.p >= 0)).toBe(true);
  });

  test('keeps representative unit rules in the catalog', () => {
    expect(allItems.find((item) => item.id === 'heat_001')?.u).toBe('шт');
    expect(allItems.find((item) => item.id === 'floor_001')?.u).toBe('м²');
  });
});
