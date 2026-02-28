'use client';

import { memo } from 'react';
import { useAppStore, formatCurrency } from '@/lib/store';
import { FileText, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Header = memo(function Header() {
  const { currentTab, setTab, items, calculateTotals, hydrated } = useAppStore();
  const totals = calculateTotals();
  const count = items.length;

  // Показываем начальные значения до гидратации
  const displayTotal = hydrated ? totals.grandTotal : 0;
  const displayCount = hydrated ? count : 0;

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-3 sm:px-4 py-2.5 sm:py-3 safe-top">
      <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-5xl mx-auto">
        {/* Left - Back Button */}
        <div className="min-w-[40px] sm:min-w-[44px]">
          {currentTab !== 'catalog' && (
            <button
              onClick={() => setTab('catalog')}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all touch-manipulation"
              aria-label="Назад"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Center - Logo */}
        <button
          onClick={() => setTab('catalog')}
          className="text-base sm:text-lg font-extrabold tracking-tight gradient-text touch-manipulation"
          aria-label="На главную"
        >
          СантехСчет
        </button>

        {/* Right - Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setTab('settings')}
            className={cn(
              'w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all touch-manipulation',
              currentTab === 'settings'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-primary hover:text-primary-foreground active:scale-95'
            )}
            aria-label="Настройки"
          >
            <Settings className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </button>

          <button
            onClick={() => setTab(currentTab === 'invoice' ? 'catalog' : 'invoice')}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all touch-manipulation',
              currentTab === 'invoice'
                ? 'bg-primary/20 text-primary'
                : 'gradient-bg text-white hover:shadow-lg hover:shadow-primary/25 active:scale-95'
            )}
            aria-label="Открыть смету"
          >
            <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0" />
            <span className="tabular-nums hidden sm:inline">{formatCurrency(displayTotal)}</span>
            <span className="tabular-nums sm:hidden">{displayCount}</span>
            {displayCount > 0 && (
              <span className="bg-white/25 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                {displayCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
});
