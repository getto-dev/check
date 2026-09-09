'use client';

import { useMemo, useRef, useState } from 'react';
import { FolderOpen, Save, Printer, Trash2, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { calculateTotals, formatCurrency, formatQuantity } from '@/lib/format';
import { exportToPdf } from '@/lib/pdf';
import { loadEstimateFromFile, saveEstimateToFile, EstimateFileError } from '@/lib/estimate-format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { QuantityStepper } from '@/components/QuantityStepper';

export function InvoiceSection() {
  const items = useAppStore((state) => state.items);
  const settings = useAppStore((state) => state.settings);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const removeItem = useAppStore((state) => state.removeItem);
  const clearItems = useAppStore((state) => state.clearItems);
  const loadEstimateData = useAppStore((state) => state.loadEstimateData);
  const totals = useMemo(() => calculateTotals(items, settings.discountPercent), [items, settings.discountPercent]);
  const file = useRef<HTMLInputElement>(null);
  const [overwrite, setOverwrite] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [savingHtml, setSavingHtml] = useState(false);
  const { showToast } = useToast();

  const load = async (selectedFile: File) => {
    try {
      const data = await loadEstimateFromFile(selectedFile);
      loadEstimateData(data.items, data.settings);
      showToast(`Смета «${data.name}» открыта`, 'success');
    } catch (error) {
      showToast(error instanceof EstimateFileError ? error.message : 'Не удалось открыть файл', 'error');
    }
  };

  const open = (selectedFile: File) => {
    if (items.length) setOverwrite(selectedFile);
    else void load(selectedFile);
  };

  const handlePdf = async () => {
    if (!items.length || exporting) return;
    setExporting(true);
    try {
      await exportToPdf(items, settings);
      showToast('PDF сметы создан', 'success');
    } catch (error) {
      console.error(error);
      showToast('Не удалось создать PDF. Проверьте соединение и повторите попытку.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveHtml = async () => {
    if (!items.length || savingHtml) return;
    setSavingHtml(true);
    try {
      const fileName = await saveEstimateToFile(items, settings);
      if (fileName) showToast('HTML сметы сохранён', 'success');
    } catch (error) {
      console.error(error);
      showToast('Не удалось сохранить HTML. Проверьте соединение и повторите попытку.', 'error');
    } finally {
      setSavingHtml(false);
    }
  };

  return <div className="screen-only space-y-6 px-3 pt-4 pb-6 sm:px-4 sm:pt-6 sm:pb-8">
    <header className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-border">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Текущий документ</p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">Смета</h2>
        <p className="mt-1 text-sm text-muted-foreground break-words">{settings.address || 'Адрес не указан'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button" onClick={() => file.current?.click()}><FolderOpen className="w-4 h-4" />Открыть</button>
        <button type="button" className="button" onClick={() => void handleSaveHtml()} disabled={!items.length || savingHtml}><Save className="w-4 h-4" />{savingHtml ? 'Сохранение…' : 'Сохранить'}</button>
        <button type="button" className="button bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground" onClick={() => void handlePdf()} disabled={!items.length || exporting}><Printer className="w-4 h-4" />{exporting ? 'Создание…' : 'PDF'}</button>
        <input ref={file} type="file" accept=".html,text/html" hidden onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) open(selectedFile); event.target.value = ''; }} />
      </div>
    </header>

    {items.length === 0 ? <div className="text-center py-16 text-muted-foreground"><p className="text-lg font-bold text-foreground">Смета пока пустая</p><p className="mt-1">Добавьте позиции из каталога или создайте свою.</p></div> : <>
      <div className="space-y-0">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-border/70 py-4 sm:flex sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold leading-snug break-words">{item.name}</div>
              <div className="mt-1 text-xs text-muted-foreground break-words">{formatCurrency(item.priceKopecks)} / {item.unit}{item.description && <span> · {item.description}</span>}</div>
            </div>
            <QuantityStepper
              value={item.quantity}
              onChange={(quantity) => updateQuantity(item.id, quantity)}
              className="row-start-2 col-start-1 sm:row-auto sm:col-auto sm:w-48"
              label="Количество"
              valueLabel={item.unit}
            />
            <div className="col-start-2 row-start-2 self-center text-right font-extrabold tabular-nums sm:row-auto sm:col-auto sm:w-28">{formatCurrency(Math.round(item.priceKopecks * item.quantity))}</div>
            <button type="button" className="icon-button col-start-2 row-start-1 justify-self-end w-11 h-11 sm:w-8 sm:h-8 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => removeItem(item.id)} aria-label={`Удалить позицию ${index + 1}`}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="sm:ml-auto sm:max-w-sm border-t-2 border-primary pt-4">
        <div className="total-line text-muted-foreground"><span>Работы</span><span className="tabular-nums text-foreground">{formatCurrency(totals.servicesKopecks)}</span></div>
        <div className="total-line text-muted-foreground"><span>Материалы</span><span className="tabular-nums text-foreground">{formatCurrency(totals.productsKopecks)}</span></div>
        {totals.discountKopecks > 0 && <div className="total-line text-muted-foreground"><span>Скидка {settings.discountPercent}%</span><span className="tabular-nums text-foreground">−{formatCurrency(totals.discountKopecks)}</span></div>}
        <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border pt-3"><span className="text-lg font-extrabold">Итого</span><span className="text-2xl font-black tabular-nums text-primary">{formatCurrency(totals.grandTotalKopecks)}</span></div>
        <button type="button" className="button mt-4 w-full justify-center" onClick={clearItems}><RotateCcw className="w-4 h-4" />Очистить смету</button>
      </div>
    </>}

    <ConfirmDialog open={overwrite !== null} onOpenChange={(openState) => !openState && setOverwrite(null)} title="Заменить текущую смету?" description="Позиции текущей сметы будут заменены данными из файла." confirmText="Открыть" onConfirm={() => { if (overwrite) void load(overwrite); setOverwrite(null); }} variant="destructive" />
  </div>;
}
