'use client';

import { memo, useRef, useCallback } from 'react';
import { useAppStore, formatCurrency, haptic, exportToHtml } from '@/lib/store';
import { CompressedItem, Settings, InvoiceItem } from '@/lib/types';
import { Minus, Plus, Trash2, Download, Upload, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Мемоизированный компонент строки
const InvoiceItemRow = memo(function InvoiceItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: InvoiceItem;
  onUpdate: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
}) {
  const handleDecrease = useCallback(() => {
    onUpdate(item.id, -1);
    haptic('light');
  }, [item.id, onUpdate]);

  const handleIncrease = useCallback(() => {
    onUpdate(item.id, 1);
    haptic('light');
  }, [item.id, onUpdate]);

  const handleRemove = useCallback(() => {
    onRemove(item.id);
    haptic('medium');
  }, [item.id, onRemove]);

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-3.5">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm mb-0.5 truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={handleDecrease}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-muted hover:text-primary active:scale-90 transition-all touch-manipulation"
          aria-label="Уменьшить количество"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="font-extrabold tabular-nums min-w-6 text-center text-sm sm:text-base">
          {item.quantity}
        </span>
        <button
          onClick={handleIncrease}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-muted hover:text-primary active:scale-90 transition-all touch-manipulation"
          aria-label="Увеличить количество"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <div className="font-extrabold text-sm sm:text-base gradient-text tabular-nums">
          {formatCurrency(item.amount)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {item.unit} × {formatCurrency(item.price)}
        </div>
      </div>

      {/* Delete */}
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

// Empty state
const EmptyState = memo(function EmptyState() {
  return (
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
      <div className="text-sm">Добавьте услуги из каталога</div>
    </div>
  );
});

// Section header component
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
  const { items, settings, calculateTotals, updateQuantity, removeItem, clearItems, importItems } = useAppStore();
  const totals = calculateTotals();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const services = items.filter((i) => i.type === 'service');
  const products = items.filter((i) => i.type === 'product');

  // Импорт файла
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const doc = new DOMParser().parseFromString(ev.target?.result as string, 'text/html');
        const dataTag = doc.getElementById('santech-data');
        if (dataTag) {
          const data = JSON.parse(dataTag.textContent || '{}');
          if (data.items) {
            const decompressed: InvoiceItem[] = (data.items as CompressedItem[]).map((i, index) => ({
              id: parseInt(i.i) || Date.now() + index,
              catalogId: i.i,
              name: i.n,
              description: i.d ?? '',
              quantity: i.q ?? 1,
              price: i.p ?? 0,
              unit: i.u ?? 'шт',
              type: i.t ?? 'service',
              category: i.c ?? '',
              amount: i.a ?? i.q * i.p ?? 0,
            }));
            importItems(decompressed, data.settings || settings);
          }
        }
      } catch (err) {
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importItems, settings]);

  // Экспорт
  const handleExport = useCallback(() => {
    if (!items.length) return;
    exportToHtml(items, settings);
    haptic('success');
  }, [items, settings]);

  // Очистка
  const handleClear = useCallback(() => {
    if (!items.length) return;
    if (confirm('Очистить смету?')) {
      clearItems();
      haptic('medium');
    }
  }, [items.length, clearItems]);

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-start gap-3 sm:gap-4 pb-3 sm:pb-4 border-b-2 border-primary">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide gradient-text">
            Смета
          </h2>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1 max-w-[200px] sm:max-w-none truncate">
            {settings.address || 'Адрес не указан'}
          </p>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            title="Загрузить"
            className="rounded-xl h-10 w-10 sm:h-11 sm:w-11 hover:text-primary touch-manipulation"
            aria-label="Загрузить смету"
          >
            <Upload className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            title="Сохранить"
            className="rounded-xl h-10 w-10 sm:h-11 sm:w-11 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 touch-manipulation"
            aria-label="Сохранить смету"
          >
            <Download className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            title="Очистить"
            className="rounded-xl h-10 w-10 sm:h-11 sm:w-11 hover:text-destructive hover:bg-destructive/10 touch-manipulation"
            aria-label="Очистить смету"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          onChange={handleImport}
          className="hidden"
          aria-hidden="true"
        />
      </header>

      {/* Services */}
      {services.length > 0 && (
        <section aria-label="Работы и услуги">
          <SectionHeader title="Работы и услуги" count={services.length} />
          <div className="divide-y divide-border">
            {services.map((item) => (
              <InvoiceItemRow
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <section aria-label="Материалы">
          <SectionHeader title="Материалы" count={products.length} />
          <div className="divide-y divide-border">
            {products.map((item) => (
              <InvoiceItemRow
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </section>
      )}

      {/* Totals */}
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
    </div>
  );
}
