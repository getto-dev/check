import { describe, expect, test } from 'bun:test';

import { isDiscreteUnit, normalizeQuantity, quantityStep } from './quantity';

describe('quantity rules', () => {
  test('recognizes only шт as a discrete unit', () => {
    expect(isDiscreteUnit('шт')).toBe(true);
    expect(isDiscreteUnit(' ШТ ')).toBe(true);
    expect(isDiscreteUnit('м²')).toBe(false);
    expect(isDiscreteUnit('м')).toBe(false);
  });

  test('normalizes piece quantities to positive whole numbers', () => {
    expect(normalizeQuantity(0, 'шт')).toBe(1);
    expect(normalizeQuantity(0.9, 'шт')).toBe(1);
    expect(normalizeQuantity(1.9, 'шт')).toBe(2);
    expect(normalizeQuantity(4, 'шт')).toBe(4);
    expect(normalizeQuantity(Number.NaN, 'шт')).toBe(1);
  });

  test('keeps measurable quantities fractional with 0.1 minimum', () => {
    expect(normalizeQuantity(0, 'м²')).toBe(0.1);
    expect(normalizeQuantity(0.9, 'м²')).toBe(0.9);
    expect(normalizeQuantity(1.234, 'м²')).toBe(1.23);
    expect(normalizeQuantity(Number.NaN, 'м²')).toBe(0.1);
  });

  test('uses unit-aware steps', () => {
    expect(quantityStep(1, 'шт', -1)).toBe(1);
    expect(quantityStep(1, 'шт', 1)).toBe(1);
    expect(quantityStep(1, 'м²', -1)).toBe(0.1);
    expect(quantityStep(1, 'м²', 1)).toBe(1);
    expect(quantityStep(0.5, 'м²', -1)).toBe(0.1);
  });
});
