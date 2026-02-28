'use client';

import { memo, useMemo, useCallback } from 'react';
import { useAppStore, formatCurrency, haptic } from '@/lib/store';
import { CATALOG, CATEGORIES } from '@/lib/catalog';
import { CatalogItem } from '@/lib/types';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Подсветка совпадений (вынесена для оптимизации)
const highlight = (text: string, query: string) => {
  if (!query || query.length < 2) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span
        key={i}
        className="gradient-bg/25 bg-gradient-to-r px-0.5 rounded font-semibold text-primary"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
};

// Мемоизированный элемент каталога
const CatalogItemCard = memo(function CatalogItemCard({
  item,
  searchQuery,
  showCategory,
  onQuickAdd,
  onOpenModal,
}: {
  item: CatalogItem;
  searchQuery: string;
  showCategory: boolean;
  onQuickAdd: (item: CatalogItem) => void;
  onOpenModal: (item: CatalogItem) => void;
}) {
  const handleCardClick = useCallback(() => onOpenModal(item), [item, onOpenModal]);
  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(item);
  }, [item, onQuickAdd]);

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl cursor-pointer group',
        'bg-card border border-border',
        'hover:border-primary hover:translate-x-1 hover:shadow-lg',
        'active:scale-[0.99] transition-all relative overflow-hidden',
        'touch-manipulation'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Left gradient indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 gradient-bg opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1 truncate">
          {highlight(item.n, searchQuery)}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {highlight(item.d, searchQuery)}
        </p>
        {showCategory && (
          <span className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wide block">
            {CATEGORIES[item.catId]?.name}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <div className="font-extrabold text-sm sm:text-base gradient-text tabular-nums">
          {formatCurrency(item.p)}
        </div>
        <div className="text-[10px] text-muted-foreground font-semibold uppercase">
          {item.u}
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddClick}
        className={cn(
          'w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full flex-shrink-0',
          'gradient-bg text-white',
          'hover:shadow-lg hover:shadow-primary/30 active:scale-90 transition-all',
          'touch-manipulation'
        )}
        aria-label={`Добавить ${item.n}`}
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </article>
  );
});

// Empty state component
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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <div className="text-base font-bold text-foreground mb-2">Ничего не найдено</div>
      <div className="text-sm">Попробуйте изменить запрос</div>
    </div>
  );
});

export function CatalogList() {
  const { selectedCategory, searchQuery, addItem, openModal } = useAppStore();

  // Поиск и фильтрация с мемоизацией
  const results = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const results: (CatalogItem & { relevance: number })[] = [];

    Object.entries(CATALOG).forEach(([catId, items]) => {
      if (selectedCategory && catId !== selectedCategory) return;
      items.forEach((item) => {
        const matchName = item.n.toLowerCase().includes(query);
        const matchDesc = item.d.toLowerCase().includes(query);
        if (!query || matchName || matchDesc) {
          results.push({
            ...item,
            catId,
            relevance: matchName ? 2 : 1,
          });
        }
      });
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }, [searchQuery, selectedCategory]);

  // Колбэки с мемоизацией
  const handleQuickAdd = useCallback((item: CatalogItem) => {
    addItem(item);
    haptic('success');
  }, [addItem]);

  const handleOpenModal = useCallback((item: CatalogItem) => {
    openModal(item);
    haptic('medium');
  }, [openModal]);

  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5" role="list">
      {results.map((item) => (
        <CatalogItemCard
          key={item.id}
          item={item}
          searchQuery={searchQuery}
          showCategory={selectedCategory === null}
          onQuickAdd={handleQuickAdd}
          onOpenModal={handleOpenModal}
        />
      ))}
    </div>
  );
}
