'use client';

import { memo, useCallback, useId, useState } from 'react';
import { useAppStore, haptic } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/QuantityStepper';
import { normalizeQuantity } from '@/lib/quantity-rules';

const FormInput = memo(function FormInput({ label, value, onChange, placeholder, className, id }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; className?: string; id?: string }) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return <div className={cn('space-y-2', className)}><label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">{label}</label><input id={inputId} type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full px-4 py-3.5 rounded-xl bg-card border-2 border-border focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring" /></div>;
});

const NumberInput = memo(function NumberInput({ label, value, onChange, min, inputMode = 'decimal' }: { label: string; value: number; onChange: (value: number) => void; min?: number; inputMode?: 'numeric' | 'decimal' }) {
  const generatedId = useId();
  const inputId = `number-${generatedId.replace(/:/g, '')}`;
  const [displayValue, setDisplayValue] = useState(String(value));
  return <div className="space-y-2"><label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">{label}</label><input id={inputId} type="number" inputMode={inputMode} value={displayValue} min={min} onChange={(event) => { setDisplayValue(event.target.value); const number = Number(event.target.value); if (Number.isFinite(number)) onChange(number); }} onBlur={() => { const number = Number(displayValue); const normalized = Number.isFinite(number) ? number : (min ?? 0); onChange(normalized); setDisplayValue(String(normalized)); }} className="w-full px-4 py-3.5 rounded-xl bg-card border-2 border-border font-bold focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring" /></div>;
});

export function ManualSection() {
  const manualType = useAppStore((state) => state.manualType);
  const setManualType = useAppStore((state) => state.setManualType);
  const addManualItem = useAppStore((state) => state.addManualItem);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('шт');
  const [price, setPrice] = useState(0);

  const handleAdd = useCallback(() => {
    if (!name.trim()) return;
    addManualItem({ name: name.trim(), description: description.trim(), quantity: normalizeQuantity(quantity), unit: unit || 'шт', priceKopecks: Math.max(0, Math.round(price * 100)), type: manualType, categoryId: 'manual' });
    setName('');
    setDescription('');
    setQuantity(1);
    setUnit('шт');
    setPrice(0);
    haptic('success');
  }, [name, description, quantity, unit, price, manualType, addManualItem]);

  return <div className="space-y-5">
    <div className="flex bg-muted rounded-xl p-1" role="group" aria-label="Тип ручной позиции">
      <button type="button" onClick={() => setManualType('service')} className={cn('flex-1 py-3 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-ring', manualType === 'service' ? 'bg-card text-primary shadow' : 'text-muted-foreground')} aria-pressed={manualType === 'service'}>Услуга</button>
      <button type="button" onClick={() => setManualType('product')} className={cn('flex-1 py-3 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-ring', manualType === 'product' ? 'bg-card text-primary shadow' : 'text-muted-foreground')} aria-pressed={manualType === 'product'}>Товар</button>
    </div>
    <FormInput label="Название" value={name} onChange={setName} placeholder={manualType === 'service' ? 'Установка крана...' : 'Труба PPR 20мм...'} id="manual-name" />
    <FormInput label="Описание" value={description} onChange={setDescription} placeholder="Детали..." id="manual-description" />
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
      <QuantityStepper value={quantity} onChange={setQuantity} valueLabel="шаг 0,5 · минимум 1" />
      <FormInput label="Ед.изм" value={unit} onChange={setUnit} id="manual-unit" />
      <NumberInput label="Цена ₽" value={price} onChange={setPrice} min={0} inputMode="decimal" />
    </div>
    <Button type="button" onClick={handleAdd} disabled={!name.trim()} className="w-full py-4 rounded-xl gradient-bg text-white font-extrabold">Добавить в смету</Button>
  </div>;
}
