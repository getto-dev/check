export const isDiscreteUnit = (unit: string) => unit.trim().toLowerCase() === 'шт';

export const normalizeQuantity = (value: number, unit = 'шт') => {
  const minimum = isDiscreteUnit(unit) ? 1 : 0.1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;

  const precision = isDiscreteUnit(unit) ? 1 : 100;
  return Math.max(minimum, Math.round(numeric * precision) / precision);
};

export const quantityStep = (_quantity: number, unit: string, _direction: -1 | 1) => isDiscreteUnit(unit) ? 1 : 0.1;

export const changeQuantity = (quantity: number, unit: string, direction: -1 | 1) => normalizeQuantity(
  quantity + direction * quantityStep(quantity, unit, direction),
  unit,
);
