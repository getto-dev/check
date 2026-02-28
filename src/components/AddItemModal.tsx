'use client';

import { memo, useState, useCallback } from 'react';
import { useAppStore, formatCurrency, haptic } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Мемоизированный инпут модального окна
const ModalInput = memo(function ModalInput({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value);
    onChange(Number.isNaN(parsed) ? (min ?? 0) : parsed);
  }, [onChange, min]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        className={cn(
          'w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl text-base font-bold tabular-nums',
          'bg-muted border-2 border-transparent',
          'focus:outline-none focus:border-primary focus:bg-background transition-colors',
          'touch-manipulation'
        )}
      />
    </div>
  );
});

export const AddItemModal = memo(function AddItemModal() {
  const { modalItem, modalOpen, closeModal, addItem } = useAppStore();
  
  // Используем key для сброса состояния при открытии нового модального окна
  const modalKey = modalItem?.id ?? 'empty';
  const defaultPrice = modalItem?.p ?? 0;

  const handleConfirm = useCallback((quantity: number, price: number) => {
    if (!modalItem) return;
    addItem(modalItem, Math.max(1, quantity), Math.max(0, price));
    closeModal();
    haptic('success');
  }, [modalItem, addItem, closeModal]);

  const handleClose = useCallback((open: boolean) => {
    if (!open) closeModal();
  }, [closeModal]);

  if (!modalItem) return null;

  return (
    <Dialog open={modalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold pr-8 leading-tight">
            {modalItem.n}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {modalItem.d}
        </p>

        <ModalContent 
          key={modalKey}
          defaultPrice={defaultPrice}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
});

// Отдельный компонент для содержания модального окна с локальным состоянием
const ModalContent = memo(function ModalContent({
  defaultPrice,
  onConfirm,
}: {
  defaultPrice: number;
  onConfirm: (quantity: number, price: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(defaultPrice);

  const handleConfirm = useCallback(() => {
    onConfirm(quantity, price);
  }, [quantity, price, onConfirm]);

  const total = quantity * price;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <ModalInput
          label="Кол-во"
          value={quantity}
          onChange={setQuantity}
          min={1}
        />
        <ModalInput
          label="Цена ₽"
          value={price}
          onChange={setPrice}
          min={0}
        />
      </div>

      {/* Total preview */}
      <div className="flex justify-between items-center py-3 px-4 bg-muted rounded-xl mb-5">
        <span className="text-sm text-muted-foreground">Сумма:</span>
        <span className="text-lg sm:text-xl font-extrabold gradient-text tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>

      <Button
        onClick={handleConfirm}
        className={cn(
          'w-full py-3.5 sm:py-4 rounded-xl text-sm font-extrabold',
          'gradient-bg text-white',
          'hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all',
          'touch-manipulation'
        )}
      >
        Добавить
      </Button>
    </>
  );
});
