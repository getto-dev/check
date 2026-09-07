'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, Trash2, Save, FolderOpen, Printer, Settings2 } from 'lucide-react';
import { CATALOG, CATEGORIES } from '@/lib/catalog';
import { searchCatalog } from '@/lib/search';
import { formatCurrency, formatQuantity } from '@/lib/format';
import { loadEstimateFromFile, saveEstimateToFile, EstimateFileError } from '@/lib/estimate-format';
import { useAppStore } from '@/lib/store';

export default function HomePage() {
  const { items, settings, addCatalogItem, updateQuantity, removeItem, clear, updateSettings, setHydrated, hydrated, addManualItem } = useAppStore();
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCatalog(CATALOG, query), [query]);
  const totals = useAppStore((state) => state.totals)();

  useEffect(() => { setHydrated(true); }, [setHydrated]);

  const openEstimate = async (file: File) => {
    try {
      const data = await loadEstimateFromFile(file);
      clear();
      for (const item of data.items) {
        addManualItem({ catalogId: item.catalogId, name: item.name, description: item.description, quantity: item.quantity, priceKopecks: item.priceKopecks, unit: item.unit, type: item.type, categoryId: item.categoryId });
      }
      updateSettings(data.settings);
    } catch (error) {
      alert(error instanceof EstimateFileError ? error.message : 'Не удалось открыть смету');
    }
  };

  return <main className="app">
    <header className="top">
      <div><div className="brand">СантехСчёт</div><div className="muted">{hydrated ? `${items.length} позиций` : 'Загрузка…'}</div></div>
      <div className="toolbar no-print">
        <button className="button" onClick={() => setQuery('')} title="Каталог"><Search size={18}/></button>
        <button className="button" onClick={() => fileRef.current?.click()}><FolderOpen size={18}/> Открыть</button>
        <button className="button" onClick={() => { const name = settings.address || 'Смета'; const filename = saveEstimateToFile(items, settings, name); if (filename) alert(`Сохранено: ${filename}`); }}><Save size={18}/> Сохранить</button>
        <button className="button" onClick={() => window.print()}><Printer size={18}/> PDF</button>
      </div>
      <input ref={fileRef} className="no-print" type="file" accept=".html,text/html" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void openEstimate(file); e.target.value=''; }}/>
    </header>

    <section className="layout">
      <section className="panel">
        <div className="field"><label htmlFor="search"><Search size={16}/> Поиск</label><input id="search" className="search" placeholder="радиатор, труба 110, насос…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="catalog" aria-live="polite">
          {results.map((item) => <article className="item" key={item.id}>
            <div><h3>{item.name}</h3><p>{item.description} · {CATEGORIES.find(([id]) => id === item.categoryId)?.[1]}</p></div>
            <div><div className="price">{formatCurrency(item.priceKopecks)}</div><button className="button primary no-print" onClick={() => addCatalogItem({ catalogId:item.id,name:item.name,description:item.description,unit:item.unit,priceKopecks:item.priceKopecks,categoryId:item.categoryId })}><Plus size={16}/></button></div>
          </article>)}
        </div>
      </section>

      <aside className="panel">
        <h2>Смета</h2>
        <div className="field"><label htmlFor="address">Адрес</label><input id="address" value={settings.address} onChange={(e) => updateSettings({ address:e.target.value })}/></div>
        <div className="field"><label htmlFor="discount">Скидка, %</label><input id="discount" type="number" min="0" max="100" value={settings.discountPercent} onChange={(e) => updateSettings({ discountPercent:Number(e.target.value) })}/></div>
        {items.map((item) => <div className="invoice-row" key={item.id}>
          <div><strong>{item.name}</strong><div className="muted">{formatCurrency(item.priceKopecks)} / {item.unit}</div></div>
          <div className="qty no-print"><button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={15}/></button><span>{formatQuantity(item.quantity)}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={15}/></button></div>
          <button className="button no-print" onClick={() => removeItem(item.id)} aria-label={`Удалить ${item.name}`}><Trash2 size={16}/></button>
        </div>)}
        <div className="totals"><div className="total-line"><span>Работы</span><span>{formatCurrency(totals.servicesKopecks)}</span></div><div className="total-line"><span>Материалы</span><span>{formatCurrency(totals.productsKopecks)}</span></div>{totals.discountKopecks>0 && <div className="total-line"><span>Скидка</span><span>−{formatCurrency(totals.discountKopecks)}</span></div>}<div className="total-line grand"><span>Итого</span><span>{formatCurrency(totals.grandTotalKopecks)}</span></div></div>
        <div className="toolbar no-print" style={{marginTop:12}}><button className="button" onClick={() => clear()}>Очистить</button><button className="button" onClick={() => updateSettings({ discountPercent: 0 })}><Settings2 size={16}/> Сбросить скидку</button></div>
      </aside>
    </section>
  </main>;
}
