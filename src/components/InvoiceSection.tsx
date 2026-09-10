'use client';

import { useMemo, useRef, useState } from 'react';
import { FolderOpen, Save, Printer, Trash2, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { calculateTotals, formatCurrency } from '@/lib/format';
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
      showToast('Не удалось создать PDF. Повторите попытку.', 'error');
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
      showToast('Не удалось сохранить HTML. Повторите попытку.', 'error');
    } finally {
      setSavingHtml(false);
    }
  };

  return <div className="screen-only w-full px-3 pt-4 pb-6 sm:px-4 sm:pt-6 sm:pb-8 lg:px-6">
    <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Текущий документ</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Смета</h2>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{items.length} {items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground break-words">{settings.address || 'Адрес не указан'}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <button type="button" className="button min-h-11 px-3 sm:px-4" onClick={() => file.current?.click()}><FolderOpen className="w-4 h-4" /><span>Открыть</span></button>
        <button type="button" className="button min-h-11 px-3 sm:px-4" onClick={() => void handleSaveHtml()} disabled={!items.length || savingHtml}><Save className="w-4 h-4" /><span className="hidden sm:inline">{savingHtml ? 'Сохранение…' : 'Сохранить'}</span></button>
        <button type="button" className="button min-h-11 px-3 sm:px-4 bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground" onClick={() => void handlePdf()} disabled={!items.length || exporting}><Printer className="w-4 h-4" /><span>{exporting ? '…' : 'PDF'}</span></button>
        <input ref={file} type="file" accept=".html,text/html" hidden onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) open(selectedFile); event.target.value = ''; }} />
      </div>
    </header>

    {items.length === 0 ? <div className="py-20 text-center text-muted-foreground"><p className="text-lg font-extrabold text-foreground">Смета пока пустая</p><p className="mt-1">Добавьте позиции из каталога или создайте свою.</p></div> : <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section className="min-w-0 rounded-2xl border border-border bg-card px-3 sm:px-4" aria-label="Позиции сметы">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-border/70 py-4 last:border-b-0 sm:flex sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold leading-snug break-words">{item.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">{formatCurrency(item.priceKopecks)} / {item.unit}{item.description && <span> · {item.description}</span>}</div>
            </div>
            <QuantityStepper value={item.quantity} onChange={(quantity) => updateQuantity(item.id, quantity)} className="row-start-2 col-start-1 sm:row-auto sm:col-auto sm:w-48" label="Количество" valueLabel={item.unit} />
            <div className="col-start-2 row-start-2 self-center text-right font-extrabold tabular-nums sm:row-auto sm:col-auto sm:w-28">{formatCurrency(Math.round(item.priceKopecks * item.quantity))}</div>
            <button type="button" className="icon-button col-start-2 row-start-1 justify-self-end w-11 h-11 sm:w-8 sm:h-8 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => removeItem(item.id)} aria-label={`Удалить позицию ${index + 1}`}><Trash2 size={16} /></button>
          </div>
        ))}
      </section>

      <aside className="lg:sticky lg:top-24 rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Итоги сметы">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Итоги</div>
        <div className="mt-4 space-y-2.5">
          <div className="total-line text-muted-foreground"><span>Работы</span><span className="tabular-nums text-foreground">{formatCurrency(totals.servicesKopecks)}</span></div>
          <div className="total-line text-muted-foreground"><span>Материалы</span><span className="tabular-nums text-foreground">{formatCurrency(totals.productsKopecks)}</span></div>
          {totals.discountKopecks > 0 && <div className="total-line text-muted-foreground"><span>Скидка {settings.discountPercent}%</span><span className="tabular-nums text-foreground">−{formatCurrency(totals.discountKopecks)}</span></div>}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-4"><span className="text-sm font-bold">Итого</span><span className="text-2xl font-black tabular-nums text-primary">{formatCurrency(totals.grandTotalKopecks)}</span></div>
          <button type="button" className="button mt-4 min-h-11 w-full justify-center" onClick={clearItems}><RotateCcw className="w-4 h-4" />Очистить смету</button>
        </div>
      </aside>
    </div>}

    <ConfirmDialog open={overwrite !== null} onOpenChange={(openState) => !openState && setOverwrite(null)} title="Заменить текущую смету?" description="Позиции текущей сметы будут заменены данными из файла." confirmText="Открыть" onConfirm={() => { if (overwrite) void load(overwrite); setOverwrite(null); }} variant="destructive" />
  </div>;
}
