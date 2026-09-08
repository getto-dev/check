'use client';

import { useMemo, useRef, useState } from 'react';
import { FolderOpen, Save, Printer, Minus, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { calculateTotals, formatCurrency, formatQuantity } from '@/lib/format';
import { exportToPdf } from '@/lib/pdf';
import { loadEstimateFromFile, saveEstimateToFile, EstimateFileError } from '@/lib/estimate-format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

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

  return <div className="screen-only space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-primary">
      <div>
        <h2 className="text-2xl font-extrabold gradient-text">Смета</h2>
        <p className="text-xs text-muted-foreground">{settings.address || 'Адрес не указан'}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="button" onClick={() => file.current?.click()}><FolderOpen className="w-4 h-4" />Открыть</button>
        <button type="button" className="button" onClick={() => void handleSaveHtml()} disabled={!items.length || savingHtml}><Save className="w-4 h-4" />{savingHtml ? 'Сохранение…' : 'Сохранить'}</button>
        <button type="button" className="button" onClick={() => void handlePdf()} disabled={!items.length || exporting}><Printer className="w-4 h-4" />{exporting ? 'Создание…' : 'PDF'}</button>
        <input ref={file} type="file" accept=".html,text/html" hidden onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) open(selectedFile); event.target.value = ''; }} />
      </div>
    </header>

    {items.length === 0 ? <div className="text-center py-16 text-muted-foreground"><p className="text-lg font-bold text-foreground">Смета пуста</p><p>Добавьте позиции из каталога.</p></div> : <>
      {items.map((item) => <div key={item.id} className="flex items-center gap-2 border-b border-border py-3"><div className="flex-1 min-w-0"><div className="font-bold truncate">{item.name}</div><div className="text-xs text-muted-foreground">{formatCurrency(item.priceKopecks)} / {item.unit}</div></div><div className="flex items-center gap-1"><button type="button" className="icon-button focus-visible:ring-2 focus-visible:ring-ring" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Уменьшить количество"><Minus size={15} /></button><span className="min-w-8 text-center font-bold">{formatQuantity(item.quantity)}</span><button type="button" className="icon-button focus-visible:ring-2 focus-visible:ring-ring" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Увеличить количество"><Plus size={15} /></button></div><div className="w-28 text-right font-extrabold">{formatCurrency(Math.round(item.priceKopecks * item.quantity))}</div><button type="button" className="icon-button focus-visible:ring-2 focus-visible:ring-ring" onClick={() => removeItem(item.id)} aria-label="Удалить"><Trash2 size={16} /></button></div>)}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <div className="total-line"><span>Работы</span><span>{formatCurrency(totals.servicesKopecks)}</span></div>
        <div className="total-line"><span>Материалы</span><span>{formatCurrency(totals.productsKopecks)}</span></div>
        {totals.discountKopecks > 0 && <div className="total-line"><span>Скидка {settings.discountPercent}%</span><span>−{formatCurrency(totals.discountKopecks)}</span></div>}
        <div className="total-line grand"><span>Итого</span><span>{formatCurrency(totals.grandTotalKopecks)}</span></div>
        <button type="button" className="button focus-visible:ring-2 focus-visible:ring-ring" onClick={clearItems}><RotateCcw className="w-4 h-4" />Очистить</button>
      </div>
    </>}

    <ConfirmDialog open={overwrite !== null} onOpenChange={(openState) => !openState && setOverwrite(null)} title="Заменить текущую смету?" description="Позиции текущей сметы будут заменены данными из файла." confirmText="Открыть" onConfirm={() => { if (overwrite) void load(overwrite); setOverwrite(null); }} variant="destructive" />
  </div>;
}
