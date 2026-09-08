'use client';
import { useMemo, useRef, useState } from 'react';
import { FolderOpen, Save, Printer, Minus, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { calculateTotals, formatCurrency, formatQuantity } from '@/lib/format';
import { loadEstimateFromFile, saveEstimateToFile, EstimateFileError } from '@/lib/estimate-format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

function PrintEstimate({ items, settings }: { items: ReturnType<typeof useAppStore.getState>['items']; settings: ReturnType<typeof useAppStore.getState>['settings'] }) {
  const totals = useMemo(() => calculateTotals(items, settings.discount), [items, settings.discount]);
  const services = items.filter((item) => item.type === 'service');
  const products = items.filter((item) => item.type === 'product');
  const now = new Date();
  const number = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`;

  const section = (title: string, rows: typeof items) => {
    if (!rows.length) return null;
    const subtotal = rows.reduce((sum, item) => sum + Math.round(item.priceKopecks * item.quantity), 0);
    return (
      <section className="print-table-section">
        <div className="print-section-title">{title}</div>
        <table className="print-table">
          <thead><tr><th>Наименование</th><th>Кол.</th><th>Цена</th><th>Всего</th></tr></thead>
          <tbody>
            {rows.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</td><td>{formatQuantity(item.quantity)} {item.unit}</td><td>{formatCurrency(item.priceKopecks)}</td><td>{formatCurrency(Math.round(item.priceKopecks * item.quantity))}</td></tr>)}
          </tbody>
        </table>
        <div className="print-subtotal">Итого за {title === 'РАБОТЫ И УСЛУГИ' ? 'услуги' : 'материалы'}: <strong>{formatCurrency(subtotal)}</strong></div>
      </section>
    );
  };

  return <div className="print-only print-estimate">
    <div className="print-header"><div><div className="print-title">СЧЕТ №{number}</div><div className="print-date">СантехСчёт</div></div><div className="print-object"><span>ОБЪЕКТ:</span> {settings.address || 'объект не указан'}</div></div>
    {section('РАБОТЫ И УСЛУГИ', services)}
    {section('МАТЕРИАЛЫ И ТОВАРЫ', products)}
    <div className="print-totals">
      {totals.discountKopecks > 0 && <div className="print-total-row"><span>Скидка на работы ({settings.discount}%)</span><strong>−{formatCurrency(totals.discountKopecks)}</strong></div>}
      <div className="print-total-final"><span>ИТОГО К ОПЛАТЕ:</span><strong>{formatCurrency(totals.grandTotalKopecks)}</strong></div>
    </div>
  </div>;
}

export function InvoiceSection() {
  const { items, settings, updateQuantity, removeItem, clearItems, loadEstimateData } = useAppStore();
  const totals = useMemo(() => calculateTotals(items, settings.discount), [items, settings.discount]);
  const file = useRef<HTMLInputElement>(null);
  const [overwrite, setOverwrite] = useState<File | null>(null);
  const { showToast } = useToast();
  const load = async (f: File) => { try { const data = await loadEstimateFromFile(f); loadEstimateData(data.items, data.settings); showToast(`Смета «${data.name}» открыта`, 'success'); } catch (error) { showToast(error instanceof EstimateFileError ? error.message : 'Не удалось открыть файл', 'error'); } };
  const open = (f: File) => { if (items.length) setOverwrite(f); else void load(f); };

  return <>
    <div className="screen-only space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-primary"><div><h2 className="text-2xl font-extrabold gradient-text">Смета</h2><p className="text-xs text-muted-foreground">{settings.address || 'Адрес не указан'}</p></div><div className="flex gap-2"><button type="button" className="button" onClick={() => file.current?.click()}><FolderOpen className="w-4 h-4" />Открыть</button><button type="button" className="button" onClick={() => saveEstimateToFile(items, settings)} disabled={!items.length}><Save className="w-4 h-4" />Сохранить</button><button type="button" className="button" onClick={() => window.print()} disabled={!items.length}><Printer className="w-4 h-4" />PDF</button><input ref={file} type="file" accept=".html,text/html" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = ''; }} /></div></header>
      {items.length === 0 ? <div className="text-center py-16 text-muted-foreground"><p className="text-lg font-bold text-foreground">Смета пуста</p><p>Добавьте позиции из каталога.</p></div> : <>{items.map((item) => <div key={item.id} className="flex items-center gap-2 border-b border-border py-3"><div className="flex-1 min-w-0"><div className="font-bold truncate">{item.name}</div><div className="text-xs text-muted-foreground">{formatCurrency(item.priceKopecks)} / {item.unit}</div></div><div className="flex items-center gap-1"><button type="button" className="icon-button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Уменьшить количество"><Minus size={15} /></button><span className="min-w-8 text-center font-bold">{formatQuantity(item.quantity)}</span><button type="button" className="icon-button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Увеличить количество"><Plus size={15} /></button></div><div className="w-28 text-right font-extrabold">{formatCurrency(Math.round(item.priceKopecks * item.quantity))}</div><button type="button" className="icon-button" onClick={() => removeItem(item.id)} aria-label="Удалить"><Trash2 size={16} /></button></div>)}<div className="rounded-2xl bg-card border border-border p-4 space-y-2"><div className="total-line"><span>Работы</span><span>{formatCurrency(totals.servicesKopecks)}</span></div><div className="total-line"><span>Материалы</span><span>{formatCurrency(totals.productsKopecks)}</span></div>{totals.discountKopecks > 0 && <div className="total-line"><span>Скидка {settings.discount}%</span><span>−{formatCurrency(totals.discountKopecks)}</span></div>}<div className="total-line grand"><span>Итого</span><span>{formatCurrency(totals.grandTotalKopecks)}</span></div><button type="button" className="button" onClick={() => clearItems()}><RotateCcw className="w-4 h-4" />Очистить</button></div></>}
      <ConfirmDialog open={overwrite !== null} onOpenChange={(openState) => !openState && setOverwrite(null)} title="Заменить текущую смету?" description="Позиции текущей сметы будут заменены данными из файла." confirmText="Открыть" onConfirm={() => { if (overwrite) void load(overwrite); setOverwrite(null); }} variant="destructive" />
    </div>
    <PrintEstimate items={items} settings={settings} />
  </>;
}
