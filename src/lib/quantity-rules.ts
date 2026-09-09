export const MIN_QUANTITY = 1;
export const QUANTITY_STEP = 0.5;

export const normalizeQuantity = (value: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MIN_QUANTITY;

  return Math.max(MIN_QUANTITY, Math.round(numeric / QUANTITY_STEP) * QUANTITY_STEP);
};

export const changeQuantity = (quantity: number, direction: -1 | 1) => normalizeQuantity(
  normalizeQuantity(quantity) + direction * QUANTITY_STEP,
);
