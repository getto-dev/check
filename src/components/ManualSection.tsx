'use client';

import { memo, useState, useCallback } from 'react';
import { useAppStore, haptic } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Мемоизированный инпут
const FormInput = memo(function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
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

    // Reset
    setName('');
    setDescription('');
    setQuantity(1);
    setUnit('шт');
    setPrice(0);

    haptic('success');
  }, [name, description, quantity, unit, price, manualType, addManualItem]);

  const handleSetService = useCallback(() => setManualType('service'), [setManualType]);
  const handleSetProduct = useCallback(() => setManualType('product'), [setManualType]);

  const handleQuantityChange = useCallback((v: string) => setQuantity(parseInt(v) || 1), []);
  const handlePriceChange = useCallback((v: string) => setPrice(parseInt(v) || 0), []);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Toggle */}
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

      {/* Form */}
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
          <FormInput
            label="Кол-во"
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            min={1}
          />

          <FormInput
            label="Ед.изм"
            value={unit}
            onChange={setUnit}
          />

          <FormInput
            label="Цена ₽"
            type="number"
            value={price}
            onChange={handlePriceChange}
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
