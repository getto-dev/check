'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';

function AddItemForm({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const addItem = useAppStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [priceKopecks, setPriceKopecks] = useState(0);
  const price = priceKopecks || item.priceKopecks;

  return <>
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-1">Количество<input type="number" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(Math.max(0.1, Number(event.target.value) || 0.1))} /></label>
      <label className="space-y-1">Цена ₽<input type="number" min="0" step="0.01" value={price / 100} onChange={(event) => setPriceKopecks(Math.max(0, Math.round(Number(event.target.value || 0) * 100)))} /></label>
    </div>
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted"><span>Сумма</span><strong>{formatCurrency(Math.round(price * quantity))}</strong></div>
    <Button type="button" onClick={() => { addItem(item, quantity, price); onClose(); }}>Добавить</Button>
  </>;
}

export function AddItemModal() {
  const modalItem = useAppStore((state) => state.modalItem);
  const modalOpen = useAppStore((state) => state.modalOpen);
  const closeModal = useAppStore((state) => state.closeModal);

  if (!modalItem) return null;

  return <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{modalItem.name}</DialogTitle>
        <DialogDescription>{modalItem.description}</DialogDescription>
      </DialogHeader>
      <AddItemForm key={modalItem.id} item={modalItem} onClose={closeModal} />
    </DialogContent>
  </Dialog>;
}
