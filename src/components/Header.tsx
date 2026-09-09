import { memo, useMemo } from 'react';
import { useAppStore, formatCurrency } from '@/lib/store';
import { calculateTotals } from '@/lib/format';
import { FileText, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Header = memo(function Header() {
  const currentTab = useAppStore((state) => state.currentTab);
  const setTab = useAppStore((state) => state.setTab);
  const items = useAppStore((state) => state.items);
  const discountPercent = useAppStore((state) => state.settings.discountPercent);
  const hydrated = useAppStore((state) => state.hydrated);
  const totals = useMemo(() => calculateTotals(items, discountPercent), [items, discountPercent]);
  const count = items.length;

  return <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-3 sm:px-4 py-2.5 sm:py-3 safe-top">
    <div className="relative flex items-center justify-between gap-2 sm:gap-3 max-w-5xl mx-auto">
      <div className="min-w-[40px] sm:min-w-[44px]">
        {currentTab !== 'catalog' && <button type="button" onClick={() => setTab('catalog')} className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-muted hover:bg-secondary hover:text-primary active:scale-95 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-ring" aria-label="Назад"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>}
      </div>
      <button type="button" onClick={() => setTab('catalog')} className="absolute left-1/2 -translate-x-1/2 text-base sm:text-lg font-extrabold tracking-tight gradient-text whitespace-nowrap touch-manipulation focus-visible:ring-2 focus-visible:ring-ring sm:static sm:translate-x-0" aria-label="На главную">СантехСчёт</button>
      <div className="desktop-only flex items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={() => setTab(currentTab === 'settings' ? 'catalog' : 'settings')} className={cn('w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-ring', currentTab === 'settings' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary hover:text-primary active:scale-95')} aria-label="Настройки"><Settings className="w-5 h-5" /></button>
        <button type="button" onClick={() => setTab(currentTab === 'invoice' ? 'catalog' : 'invoice')} className={cn('flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-ring', currentTab === 'invoice' ? 'bg-secondary text-primary' : 'gradient-bg text-white hover:shadow-lg active:scale-95')} aria-label="Открыть смету">
          <FileText className="w-4 h-4" />
          <span className="tabular-nums">{formatCurrency(hydrated ? totals.grandTotalKopecks : 0)}</span>
          {hydrated && count > 0 && <span className="bg-white/25 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">{count}</span>}
        </button>
      </div>
    </div>
  </header>;
});
