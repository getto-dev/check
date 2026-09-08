'use client';

import { memo, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, CATALOG } from '@/lib/catalog';
import { searchCatalog } from '@/lib/search';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';

const CATEGORY_NAMES = new Map<string, string>(CATEGORIES.map((category) => [category.id, category.name]));

const Card = memo(function Card({ item, onAdd, onOpen }: { item: CatalogItem; onAdd: () => void; onOpen: () => void }) {
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:items-center gap-x-3 gap-y-2 p-3.5 sm:p-4 rounded-2xl bg-card border border-border overflow-hidden">
      <button
        type="button"
        className="min-w-0 w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onOpen}
        aria-label={`Открыть ${item.name}`}
      >
        <h3 className="font-bold leading-snug break-words line-clamp-2">{item.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words line-clamp-2">{item.description}</p>
        <p className="text-[10px] leading-tight text-muted-foreground/70 uppercase mt-1.5 break-words">{CATEGORY_NAMES.get(item.categoryId)}</p>
      </button>

      <div className="row-start-1 col-start-2 flex items-center gap-2 sm:ml-auto">
        <div className="text-right whitespace-nowrap">
          <div className="font-extrabold tabular-nums">{formatCurrency(item.priceKopecks)}</div>
          <div className="text-[10px] text-muted-foreground">{item.unit}</div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="w-11 h-11 shrink-0 rounded-full gradient-bg text-white flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Добавить ${item.name}`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </article>
  );
});

export const CatalogList = memo(function CatalogList() {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const selectedCategory = useAppStore((state) => state.selectedCategory);
  const addItem = useAppStore((state) => state.addItem);
  const openModal = useAppStore((state) => state.openModal);
  const items = useMemo(() => searchCatalog(CATALOG, searchQuery, selectedCategory ?? undefined), [searchQuery, selectedCategory]);
  const add = useCallback((item: CatalogItem) => addItem(item), [addItem]);
  const open = useCallback((item: CatalogItem) => openModal(item), [openModal]);

  if (!items.length) return <div className="text-center py-16 text-muted-foreground">Ничего не найдено</div>;
  return <div className="space-y-2" role="list">{items.map((item) => <div key={item.id} role="listitem"><Card item={item} onAdd={() => add(item)} onOpen={() => open(item)} /></div>)}</div>;
});
