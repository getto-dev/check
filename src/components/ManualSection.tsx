'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { useAppStore, haptic } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const FormInput = memo(function FormInput({
  label,
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl text-sm',
          'bg-card border-2 border-border',
          'focus:outline-none focus:border-primary transition-colors',
          'touch-manipulation'
        )}
      />
    </div>
  );
});

const NumberInput = memo(function NumberInput({
  label,
  value,
  onChange,
  min,
  className,
  id,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
  id?: string;
}) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const [displayValue, setDisplayValue] = useState(String(value));

  useEffect(() => {
    setDisplayValue(String(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    if (newValue === '') {
      return;
    }
    const parsed = parseInt(newValue);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    const parsed = parseInt(displayValue);
    const finalValue = Number.isNaN(parsed) ? (min ?? 0) : parsed;
    onChange(finalValue);
    setDisplayValue(String(finalValue));
  }, [displayValue, onChange, min]);

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        className={cn(
          'w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold tabular-nums',
          'bg-card border-2 border-border',
          'focus:outline-none focus:border-primary transition-colors',
          'touch-manipulation'
        )}
      />
    </div>
  );
});

export function ManualSection() {
  const { manualType, setManualType, addManualItem } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('шт');
  const [price, setPrice] = useState(0);

  const handleAdd = useCallback(() => {
    if (!name.trim()) return;

    addManualItem({
      name: name.trim(),
      description: description.trim(),
      quantity: Math.max(1, quantity),
      unit: unit || 'шт',
      price: Math.max(0, price),
      type: manualType,
      category: 'manual',
    });

    setName('');
    setDescription('');
    setQuantity(1);
    setUnit('шт');
    setPrice(0);

    haptic('success');
  }, [name, description, quantity, unit, price, manualType, addManualItem]);

  const handleSetService = useCallback(() => setManualType('service'), [setManualType]);
  const handleSetProduct = useCallback(() => setManualType('product'), [setManualType]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex bg-muted rounded-xl p-1" role="tablist">
        <button
          onClick={handleSetService}
          role="tab"
          aria-selected={manualType === 'service'}
          className={cn(
            'flex-1 py-2.5 sm:py-3 rounded-lg text-sm font-bold transition-all touch-manipulation',
            manualType === 'service'
              ? 'bg-card text-primary shadow-md'
              : 'text-muted-foreground'
          )}
        >
          Услуга
        </button>
        <button
          onClick={handleSetProduct}
          role="tab"
          aria-selected={manualType === 'product'}
          className={cn(
            'flex-1 py-2.5 sm:py-3 rounded-lg text-sm font-bold transition-all touch-manipulation',
            manualType === 'product'
              ? 'bg-card text-primary shadow-md'
              : 'text-muted-foreground'
          )}
        >
          Товар
        </button>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <FormInput
          label="Название"
          value={name}
          onChange={setName}
          placeholder={manualType === 'service' ? 'Установка крана...' : 'Труба PPR 20мм...'}
        />

        <FormInput
          label="Описание"
          value={description}
          onChange={setDescription}
          placeholder="Детали..."
        />

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <NumberInput
            label="Кол-во"
            value={quantity}
            onChange={setQuantity}
            min={1}
          />

          <FormInput
            label="Ед.изм"
            value={unit}
            onChange={setUnit}
          />

          <NumberInput
            label="Цена ₽"
            value={price}
            onChange={setPrice}
            min={0}
          />
        </div>

        <Button
          onClick={handleAdd}
          disabled={!name.trim()}
          className={cn(
            'w-full py-3.5 sm:py-4 rounded-xl text-sm font-extrabold',
            'gradient-bg text-white',
            'hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'
          )}
        >
          Добавить в смету
        </Button>
      </div>
    </div>
  );
}
