'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { changeQuantity, normalizeQuantity } from '@/lib/quantity-rules';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  label?: string;
  valueLabel?: string;
}

export function QuantityStepper({ value, onChange, className, label = 'Количество', valueLabel }: QuantityStepperProps) {
  const normalizedValue = normalizeQuantity(value);
  const [draft, setDraft] = useState(String(normalizedValue));
  const lastAppliedValue = useRef(normalizedValue);

  useEffect(() => {
    // Sync externally changed values, but don't overwrite text while the user
    // is editing and the parent value has not changed.
    if (normalizedValue !== lastAppliedValue.current) {
      setDraft(String(normalizedValue));
      lastAppliedValue.current = normalizedValue;
    }
  }, [normalizedValue]);

  const applyValue = (nextValue: number) => {
    const normalized = normalizeQuantity(nextValue);
    setDraft(String(normalized));
    lastAppliedValue.current = normalized;
    onChange(normalized);
  };

  const decrease = () => applyValue(changeQuantity(normalizedValue, -1));
  const increase = () => applyValue(changeQuantity(normalizedValue, 1));
  const handleInputChange = (input: string) => setDraft(input);

  const handleInputBlur = () => {
    const parsed = Number(draft.replace(',', '.'));
    applyValue(Number.isFinite(parsed) ? parsed : normalizedValue);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <span className="text-sm font-bold block">{label}</span>}
      <div className="flex h-12 items-center overflow-hidden rounded-xl border border-border bg-card focus-within:border-primary">
        <button
          type="button"
          onClick={decrease}
          disabled={normalizedValue <= 1}
          className="flex h-full w-12 shrink-0 items-center justify-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Уменьшить количество"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={handleInputBlur}
          className="min-w-0 flex-1 h-full bg-transparent px-1 text-center text-base font-bold tabular-nums outline-none"
          aria-label={label}
        />
        <button
          type="button"
          onClick={increase}
          className="flex h-full w-12 shrink-0 items-center justify-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Увеличить количество"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {valueLabel && <p className="text-xs text-muted-foreground">{valueLabel}</p>}
    </div>
  );
}
