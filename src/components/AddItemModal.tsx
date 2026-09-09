'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAppStore } from '@/lib/store';
import { changeQuantity, isDiscreteUnit, normalizeQuantity, quantityStep } from '@/lib/quantity';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';

function AddItemForm({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const addItem = useAppStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [priceRubles, setPriceRubles] = useState((item.priceKopecks / 100).toFixed(2));
  const priceKopecks = Math.max(0, Math.round((Number(priceRubles.replace(',', '.')) || 0) * 100));
  const totalKopecks = Math.round(priceKopecks * quantity);
  const discrete = isDiscreteUnit(item.unit);
  const step = quantityStep(quantity, item.unit, 1);

  const updateQuantity = (direction: -1 | 1) => {
    setQuantity((current) => changeQuantity(current, item.unit, direction));
  };

  const handleQuantityChange = (value: string) => {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    setQuantity(normalizeQuantity(parsed, item.unit));
  };

  const submit = () => {
    addItem(item, quantity, priceKopecks);
    onClose();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Цена по каталогу</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatCurrency(item.priceKopecks)}</p>
        </div>
        <span className="pb-1 text-sm text-muted-foreground">за {item.unit}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-bold">Количество</span>
          <div className="flex h-12 items-center rounded-xl border border-border bg-card overflow-hidden focus-within:border-primary">
            <button type="button" onClick={() => updateQuantity(-1)} className="h-full w-12 shrink-0 flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Уменьшить количество"><Minus className="h-4 w-4" /></button>
            <input type="number" min={discrete ? 1 : 0.1} step={step} inputMode={discrete ? 'numeric' : 'decimal'} value={quantity} onChange={(event) => handleQuantityChange(event.target.value)} className="min-w-0 flex-1 h-full bg-transparent px-1 text-center text-base font-bold outline-none" aria-label="Количество" />
            <button type="button" onClick={() => updateQuantity(1)} className="h-full w-12 shrink-0 flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Увеличить количество"><Plus className="h-4 w-4" /></button>
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-bold">Цена, ₽</span>
          <div className="flex h-12 items-center rounded-xl border border-border bg-card focus-within:border-primary px-3">
            <input type="text" inputMode="decimal" value={priceRubles} onChange={(event) => setPriceRubles(event.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none" aria-label="Цена в рублях" />
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3.5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Итого</p>
          <p className="text-2xl font-extrabold tabular-nums text-primary">{formatCurrency(totalKopecks)}</p>
        </div>
        <span className="text-sm text-muted-foreground text-right">{quantity} {item.unit}</span>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
        <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={onClose}>Отмена</Button>
        <Button type="button" className="min-h-11 rounded-xl px-6" onClick={submit}>Добавить в смету</Button>
      </div>
    </div>
  );
}

export function AddItemModal() {
  const modalItem = useAppStore((state) => state.modalItem);
  const modalOpen = useAppStore((state) => state.modalOpen);
  const closeModal = useAppStore((state) => state.closeModal);

  if (!modalItem) return null;

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="mobile-sheet-content !left-0 !right-0 !top-auto !bottom-0 !w-[100vw] !max-w-none !translate-x-0 !translate-y-0 max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:!left-1/2 sm:!right-auto sm:!top-1/2 sm:!bottom-auto sm:!w-[calc(100%-2rem)] sm:!max-w-xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:max-h-[calc(100dvh-1rem)] sm:p-6 shadow-2xl">
        <DialogHeader className="pr-9">
          <DialogTitle className="text-xl sm:text-2xl font-extrabold leading-tight break-words">{modalItem.name}</DialogTitle>
          <DialogDescription className="leading-relaxed">{modalItem.description}</DialogDescription>
        </DialogHeader>
        <AddItemForm key={modalItem.id} item={modalItem} onClose={closeModal} />
      </DialogContent>
    </Dialog>
  );
}
