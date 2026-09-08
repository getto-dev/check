'use client';

import { useMemo } from 'react';
import { Calculator, FileText, Plus, Settings } from 'lucide-react';
import { useAppStore, formatCurrency } from '@/lib/store';
import { calculateTotals } from '@/lib/format';
import type { TabType } from '@/lib/types';
import { cn } from '@/lib/utils';

const items: Array<{ tab: TabType; label: string; icon: typeof Calculator }> = [
  { tab: 'catalog', label: 'Каталог', icon: Calculator },
  { tab: 'invoice', label: 'Смета', icon: FileText },
  { tab: 'manual', label: 'Своя', icon: Plus },
  { tab: 'settings', label: 'Настройки', icon: Settings },
];

export function MobileNavigation() {
  const currentTab = useAppStore((state) => state.currentTab);
  const setTab = useAppStore((state) => state.setTab);
  const itemCount = useAppStore((state) => state.items.length);
  const invoiceItems = useAppStore((state) => state.items);
  const discountPercent = useAppStore((state) => state.settings.discountPercent);
  const hydrated = useAppStore((state) => state.hydrated);
  const totals = useMemo(() => calculateTotals(invoiceItems, discountPercent), [invoiceItems, discountPercent]);
  const total = hydrated ? formatCurrency(totals.grandTotalKopecks) : formatCurrency(0);
  const hasCurrentEstimate = itemCount > 0;

  const handleTabClick = (tab: TabType) => {
    if (tab === 'invoice') {
      setTab(currentTab === 'invoice' ? 'catalog' : 'invoice');
      return;
    }
    if (tab === 'settings') {
      setTab(currentTab === 'settings' ? 'catalog' : 'settings');
      return;
    }
    setTab(tab);
  };

  return (
    <>
      <div className={cn('mobile-estimate-bar safe-bottom', hasCurrentEstimate ? 'mobile-estimate-bar--active' : 'mobile-estimate-bar--empty')}>
        <button
          type="button"
          onClick={() => setTab('invoice')}
          className="mobile-estimate-bar__button"
          aria-label="Открыть текущую смету"
        >
          <span className="min-w-0">
            <span className="mobile-estimate-bar__label">Текущая смета</span>
            <span className="mobile-estimate-bar__meta">{hydrated ? `${itemCount} ${itemCount === 1 ? 'позиция' : itemCount < 5 ? 'позиции' : 'позиций'}` : 'Загрузка…'}</span>
          </span>
          <span className="mobile-estimate-bar__total tabular-nums">{total}</span>
        </button>
      </div>

      <nav className="mobile-nav safe-bottom" aria-label="Основная навигация">
        <div className="mobile-nav__inner">
          {items.map(({ tab, label, icon: Icon }) => {
            const active = currentTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={cn('mobile-nav__item', active && 'mobile-nav__item--active')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="mobile-nav__icon-wrap">
                  <Icon className="mobile-nav__icon" aria-hidden="true" />
                  {tab === 'invoice' && itemCount > 0 && <span className="mobile-nav__badge">{itemCount > 99 ? '99+' : itemCount}</span>}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
