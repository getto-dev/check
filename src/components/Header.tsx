import { memo, useMemo } from 'react';
import { useAppStore, formatCurrency } from '@/lib/store';
import { calculateTotals } from '@/lib/format';
import { Calculator, FileText, Plus, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { tab: 'catalog' as const, label: 'Каталог', icon: Calculator },
  { tab: 'invoice' as const, label: 'Смета', icon: FileText },
  { tab: 'manual' as const, label: 'Своя позиция', icon: Plus },
  { tab: 'settings' as const, label: 'Настройки', icon: Settings },
];

export const Header = memo(function Header() {
  const currentTab = useAppStore((state) => state.currentTab);
  const setTab = useAppStore((state) => state.setTab);
  const items = useAppStore((state) => state.items);
  const discountPercent = useAppStore((state) => state.settings.discountPercent);
  const hydrated = useAppStore((state) => state.hydrated);
  const totals = useMemo(() => calculateTotals(items, discountPercent), [items, discountPercent]);
  const count = items.length;
  const total = formatCurrency(hydrated ? totals.grandTotalKopecks : 0);

  return <>
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top lg:pl-64">
      <div className="relative flex items-center justify-between gap-2 sm:gap-3 max-w-5xl lg:max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="min-w-[40px] sm:min-w-[44px]">
          {currentTab !== 'catalog' && <button type="button" onClick={() => setTab('catalog')} className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-muted hover:bg-secondary hover:text-primary active:scale-95 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-ring" aria-label="Назад"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>}
        </div>
        <button type="button" onClick={() => setTab('catalog')} className="absolute left-1/2 -translate-x-1/2 text-base sm:text-lg font-black tracking-tight gradient-text whitespace-nowrap touch-manipulation focus-visible:ring-2 focus-visible:ring-ring lg:static lg:translate-x-0" style={{ fontWeight: 900 }} aria-label="На главную">Smeta</button>
        <div className="desktop-only flex items-center gap-2">
          <div className="hidden lg:block text-right mr-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Текущая смета</div>
            <div className="text-sm font-extrabold tabular-nums">{total}{count > 0 ? ` · ${count}` : ''}</div>
          </div>
          <button type="button" onClick={() => setTab('invoice')} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-ring', currentTab === 'invoice' ? 'bg-secondary text-primary' : 'gradient-bg text-white hover:shadow-lg active:scale-95')} aria-label="Открыть смету">
            <FileText className="w-4 h-4" />
            <span className="hidden xl:inline">Смета</span>
          </button>
        </div>
      </div>
    </header>

    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-border bg-card">
      <div className="safe-top px-5 py-5 border-b border-border">
        <button type="button" onClick={() => setTab('catalog')} className="text-xl font-black tracking-tight gradient-text focus-visible:ring-2 focus-visible:ring-ring rounded-lg" aria-label="На главную">Smeta</button>
        <p className="mt-1 text-xs text-muted-foreground">Каталог и смета</p>
      </div>
      <nav className="p-3 space-y-1" aria-label="Основная навигация">
        {navigation.map(({ tab, label, icon: Icon }) => {
          const active = currentTab === tab;
          return <button key={tab} type="button" onClick={() => setTab(tab)} className={cn('w-full min-h-11 flex items-center gap-3 rounded-xl px-3 text-sm font-bold text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} aria-current={active ? 'page' : undefined}>
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{label}</span>
            {tab === 'invoice' && count > 0 && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">{count}</span>}
          </button>;
        })}
      </nav>
      <div className="mt-auto p-3 border-t border-border">
        <button type="button" onClick={() => setTab('invoice')} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-ring">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Текущая смета</div>
          <div className="mt-1 text-lg font-black text-primary tabular-nums">{total}</div>
          <div className="mt-1 text-xs text-muted-foreground">{count} {count === 1 ? 'позиция' : count < 5 ? 'позиции' : 'позиций'}</div>
        </button>
      </div>
    </aside>
  </>;
});
