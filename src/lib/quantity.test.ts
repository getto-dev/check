import { describe, expect, test } from 'bun:test';

import { changeQuantity, MIN_QUANTITY, normalizeQuantity, QUANTITY_STEP } from './quantity-rules';

describe('universal quantity rules', () => {
  test('uses one shared minimum and step', () => {
    expect(MIN_QUANTITY).toBe(1);
    expect(QUANTITY_STEP).toBe(0.5);
  });

  test('normalizes all quantities to the 0.5 grid and never below 1', () => {
    expect(normalizeQuantity(1)).toBe(1);
    expect(normalizeQuantity(1.5)).toBe(1.5);
    expect(normalizeQuantity(2)).toBe(2);
    expect(normalizeQuantity(2.5)).toBe(2.5);
    expect(normalizeQuantity(2.3)).toBe(2.5);
    expect(normalizeQuantity(1.2)).toBe(1);
    expect(normalizeQuantity(0)).toBe(1);
    expect(normalizeQuantity(-10)).toBe(1);
    expect(normalizeQuantity(Number.NaN)).toBe(1);
    expect(normalizeQuantity(Number.POSITIVE_INFINITY)).toBe(1);
    expect(normalizeQuantity(Number.NEGATIVE_INFINITY)).toBe(1);
  });

  test('changes quantity by 0.5', () => {
    expect(changeQuantity(1, -1)).toBe(1);
    expect(changeQuantity(1, 1)).toBe(1.5);
    expect(changeQuantity(1.5, -1)).toBe(1);
    expect(changeQuantity(2, -1)).toBe(1.5);
    expect(changeQuantity(2, 1)).toBe(2.5);
    expect(changeQuantity(10, -1)).toBe(9.5);
  });

  test('repairs an invalid current quantity before applying a button step', () => {
    expect(changeQuantity(0.2, -1)).toBe(1);
    expect(changeQuantity(0.2, 1)).toBe(1.5);
    expect(changeQuantity(2.3, -1)).toBe(1.5);
  });
});
