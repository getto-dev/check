'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';

function AddItemForm({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const addItem = useAppStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [priceRubles, setPriceRubles] = useState((item.priceKopecks / 100).toFixed(2));
  const priceKopecks = Math.max(0, Math.round((Number(priceRubles.replace(',', '.')) || 0) * 100));
  const totalKopecks = Math.round(priceKopecks * quantity);

  const changeQuantity = (delta: number) => setQuantity((current) => Math.max(0.1, Math.round((current + delta) * 10) / 10));

  const submit = () => {
    addItem(item, quantity, priceKopecks);
    onClose();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-accent/60 border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Цена по каталогу</p>
        <p className="mt-1 text-xl font-extrabold">{formatCurrency(item.priceKopecks)} <span className="text-sm font-medium text-muted-foreground">/ {item.unit}</span></p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-bold">Количество</span>
          <div className="flex h-12 items-center rounded-xl border-2 border-border bg-card overflow-hidden focus-within:border-primary">
            <button type="button" onClick={() => changeQuantity(-0.1)} className="h-full w-12 shrink-0 flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Уменьшить количество">
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min="0.1"
              step="0.1"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(Math.max(0.1, Number(event.target.value) || 0.1))}
              className="min-w-0 flex-1 h-full bg-transparent px-1 text-center text-base font-bold outline-none"
              aria-label="Количество"
            />
            <button type="button" onClick={() => changeQuantity(0.1)} className="h-full w-12 shrink-0 flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Увеличить количество">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-bold">Цена, ₽</span>
          <div className="flex h-12 items-center rounded-xl border-2 border-border bg-card focus-within:border-primary px-3">
            <input
              type="text"
              inputMode="decimal"
              value={priceRubles}
              onChange={(event) => setPriceRubles(event.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
              className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none"
              aria-label="Цена в рублях"
            />
          </div>
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-muted p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Итого</p>
          <p className="text-2xl font-extrabold">{formatCurrency(totalKopecks)}</p>
        </div>
        <span className="text-sm text-muted-foreground text-right">{quantity} {item.unit}</span>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl sm:max-w-xl">
        <DialogHeader className="pr-9">
          <DialogTitle className="text-xl sm:text-2xl font-extrabold leading-tight break-words">{modalItem.name}</DialogTitle>
          <DialogDescription className="leading-relaxed">{modalItem.description}</DialogDescription>
        </DialogHeader>
        <AddItemForm key={modalItem.id} item={modalItem} onClose={closeModal} />
      </DialogContent>
    </Dialog>
  );
}
