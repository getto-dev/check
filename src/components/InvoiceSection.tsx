'use client';

import { memo, useCallback, useState } from 'react';
import { useAppStore, formatCurrency, formatQuantity, haptic, exportToPdf } from '@/lib/store';
import { InvoiceItem } from '@/lib/types';
import { Minus, Plus, Trash2, Download, RotateCcw, Save, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { SavedEstimatesDialog } from '@/components/SavedEstimatesDialog';

const InvoiceItemRow = memo(function InvoiceItemRow({
  item,
  onUpdate,
  onSetQuantity,
  onRemove,
}: {
  item: InvoiceItem;
  onUpdate: (id: number, delta: number) => void;
  onSetQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}) {
  const [editValue, setEditValue] = useState<string | null>(null);

  const handleDecrease = useCallback(() => {
    const step = item.unit === 'шт' || item.unit === 'комп' || item.unit === 'выезд' || item.unit === 'контур' ? 1 : 0.5;
    onUpdate(item.id, -step);
    haptic('light');
  }, [item.id, item.unit, onUpdate]);

  const handleIncrease = useCallback(() => {
    const step = item.unit === 'шт' || item.unit === 'комп' || item.unit === 'выезд' || item.unit === 'контур' ? 1 : 0.5;
    onUpdate(item.id, step);
    haptic('light');
  }, [item.id, item.unit, onUpdate]);

  const handleQuantityClick = useCallback(() => {
    setEditValue(String(item.quantity));
  }, [item.quantity]);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleQuantityBlur = useCallback(() => {
    if (editValue !== null) {
      const parsed = parseFloat(editValue);
      const finalValue = Number.isNaN(parsed) ? item.quantity : Math.max(0.1, parsed);
      onSetQuantity(item.id, finalValue);
      setEditValue(null);
    }
  }, [editValue, item.id, item.quantity, onSetQuantity]);

  const handleQuantityKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantityBlur();
    } else if (e.key === 'Escape') {
      setEditValue(null);
    }
  }, [handleQuantityBlur]);

  const handleRemove = useCallback(() => {
    onRemove(item.id);
    haptic('medium');
  }, [item.id, onRemove]);

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-3.5">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm mb-0.5 truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={handleDecrease}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-muted hover:text-primary active:scale-90 transition-all touch-manipulation"
          aria-label="Уменьшить количество"
        >
          <Minus className="w-4 h-4" />
        </button>
        {editValue !== null ? (
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={editValue}
            onChange={handleQuantityChange}
            onBlur={handleQuantityBlur}
            onKeyDown={handleQuantityKeyDown}
            autoFocus
            className="w-16 text-center font-extrabold tabular-nums text-sm sm:text-base bg-background border border-primary rounded px-1 py-0.5 focus:outline-none"
          />
        ) : (
          <span
            className="font-extrabold tabular-nums min-w-6 text-center text-sm sm:text-base cursor-pointer hover:text-primary transition-colors"
            onClick={handleQuantityClick}
            title="Нажмите для редактирования"
          >
            {formatQuantity(item.quantity)}
          </span>
        )}
        <button
          onClick={handleIncrease}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-muted hover:text-primary active:scale-90 transition-all touch-manipulation"
          aria-label="Увеличить количество"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-extrabold text-sm sm:text-base gradient-text tabular-nums">
          {formatCurrency(item.amount)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {item.unit} × {formatCurrency(item.price)}
        </div>
      </div>

      <button
        onClick={handleRemove}
        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all touch-manipulation"
        aria-label="Удалить"
      >
        <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>
    </div>
  );
});

const EmptyState = memo(function EmptyState({
  onOpen,
  hasSaved,
}: {
  onOpen: () => void;
  hasSaved: boolean;
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-3 sm:gap-4 pb-3 sm:pb-4 border-b-2 border-primary">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide gradient-text">
            Смета
          </h2>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1 max-w-[200px] sm:max-w-none truncate">
            Адрес не указан
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onOpen}
          title="Открыть сохранённую смету"
          className="rounded-xl hover:text-primary hover:bg-primary/10 touch-manipulation"
          aria-label="Открыть сохранённую смету"
        >
          <FolderOpen className="w-5 h-5" />
          Открыть
        </Button>
      </header>

      <div className="text-center py-12 sm:py-16 px-4 text-muted-foreground">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-8 h-8 sm:w-9 sm:h-9 opacity-50"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
        </div>
        <div className="text-base font-bold text-foreground mb-2">Смета пуста</div>
        <div className="text-sm mb-5">Добавьте услуги из каталога</div>
        {hasSaved && (
          <Button
            variant="outline"
            onClick={onOpen}
            className="rounded-xl touch-manipulation"
          >
            <FolderOpen className="w-4 h-4" />
            Открыть сохранённую смету
          </Button>
        )}
      </div>
    </div>
  );
});

const SectionHeader = memo(function SectionHeader({
  title,
  count
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] sm:tracking-[2px] text-muted-foreground mb-2.5 sm:mb-3 px-2.5 sm:px-3 py-1.5 bg-muted/50 rounded-lg inline-flex items-center gap-2">
      {title}
      <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[9px]">{count}</span>
    </div>
  );
});

export function InvoiceSection() {
  const { items, settings, calculateTotals, updateQuantity, setQuantity, removeItem, clearItems, savedEstimates } = useAppStore();
  const totals = calculateTotals();
  const { showToast } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [savedDialogMode, setSavedDialogMode] = useState<'save' | 'open'>('save');

  const services = items.filter((i) => i.type === 'service');
  const products = items.filter((i) => i.type === 'product');

  const handleExport = useCallback(async () => {
    if (!items.length) return;

    try {
      await exportToPdf(items, settings);
      haptic('success');
      showToast('PDF сохранён', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Ошибка при создании PDF', 'error');
    }
  }, [items, settings, showToast]);

  const handleClearClick = useCallback(() => {
    if (!items.length) return;
    setShowClearConfirm(true);
  }, [items.length]);

  const handleClearConfirm = useCallback(() => {
    clearItems();
    haptic('medium');
    showToast('Смета очищена', 'info');
  }, [clearItems, showToast]);

  const handleSaveClick = useCallback(() => {
    if (!items.length) {
      showToast('Смета пуста — нечего сохранять', 'info');
      return;
    }
    haptic('light');
    setSavedDialogMode('save');
    setShowSavedDialog(true);
  }, [items.length, showToast]);

  const handleOpenClick = useCallback(() => {
    haptic('light');
    setSavedDialogMode('open');
    setShowSavedDialog(true);
  }, []);

  if (items.length === 0) {
    return (
      <>
        <EmptyState onOpen={handleOpenClick} hasSaved={savedEstimates.length > 0} />
        <SavedEstimatesDialog
          open={showSavedDialog}
          mode={savedDialogMode}
          onOpenChange={setShowSavedDialog}
        />
      </>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-3 sm:gap-4 pb-3 sm:pb-4 border-b-2 border-primary">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide gradient-text">
            Смета
          </h2>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1 max-w-[200px] sm:max-w-none truncate">
            {settings.address || 'Адрес не указан'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleOpenClick}
            title="Открыть сохранённую смету"
            className="rounded-xl hover:text-primary hover:bg-primary/10 touch-manipulation"
            aria-label="Открыть сохранённую смету"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Открыть</span>
          </Button>
          <Button
            variant="ghost"
            onClick={handleSaveClick}
            title="Сохранить смету"
            className="rounded-xl hover:text-primary hover:bg-primary/10 touch-manipulation"
            aria-label="Сохранить смету"
          >
            <Save className="w-5 h-5" />
            <span className="hidden sm:inline">Сохранить</span>
          </Button>
          <Button
            variant="ghost"
            onClick={handleExport}
            title="Скачать PDF"
            className="rounded-xl hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 touch-manipulation"
            aria-label="Скачать смету в PDF"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button
            variant="ghost"
            onClick={handleClearClick}
            title="Очистить"
            className="rounded-xl hover:text-destructive hover:bg-destructive/10 touch-manipulation"
            aria-label="Очистить смету"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">Очистить</span>
          </Button>
        </div>
      </header>

      {services.length > 0 && (
        <section aria-label="Работы и услуги">
          <SectionHeader title="Работы и услуги" count={services.length} />
          <div className="divide-y divide-border">
            {services.map((item) => (
              <InvoiceItemRow
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onSetQuantity={setQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section aria-label="Материалы">
          <SectionHeader title="Материалы" count={products.length} />
          <div className="divide-y divide-border">
            {products.map((item) => (
              <InvoiceItemRow
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onSetQuantity={setQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="bg-primary/5 rounded-2xl p-4 sm:p-5">
        {settings.discount > 0 && (
          <div className="flex justify-between text-sm text-destructive font-bold mb-2">
            <span>Скидка {settings.discount}%</span>
            <span>−{formatCurrency(totals.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t-2 border-primary">
          <span className="text-xs uppercase tracking-widest text-muted-foreground self-center">
            Итого
          </span>
          <span className="text-xl sm:text-2xl font-extrabold gradient-text tabular-nums">
            {formatCurrency(totals.grandTotal)}
          </span>
        </div>
      </footer>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Очистить смету?"
        description="Все добавленные позиции будут удалены. Это действие нельзя отменить."
        confirmText="Очистить"
        cancelText="Отмена"
        onConfirm={handleClearConfirm}
        variant="destructive"
      />

      <SavedEstimatesDialog
        open={showSavedDialog}
        mode={savedDialogMode}
        onOpenChange={setShowSavedDialog}
      />
    </div>
  );
}
