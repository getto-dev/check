'use client';

import { memo, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, CATALOG } from '@/lib/catalog';
import { searchCatalog } from '@/lib/search';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';

const CATEGORY_NAMES = new Map(CATEGORIES.map((category) => [category.id, category.name]));

const Card = memo(function Card({ item, onAdd, onOpen }: { item: CatalogItem; onAdd: () => void; onOpen: () => void }) {
  return <article className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
    <button type="button" className="flex-1 min-w-0 text-left rounded-xl focus-visible:ring-2 focus-visible:ring-ring" onClick={onOpen} aria-label={`Открыть ${item.name}`}>
      <h3 className="font-bold truncate">{item.name}</h3>
      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      <p className="text-[10px] text-muted-foreground/70 uppercase mt-1">{CATEGORY_NAMES.get(item.categoryId)}</p>
    </button>
    <div className="text-right"><div className="font-extrabold">{formatCurrency(item.priceKopecks)}</div><div className="text-[10px] text-muted-foreground">{item.unit}</div></div>
    <button type="button" onClick={onAdd} className="w-10 h-10 rounded-full gradient-bg text-white flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Добавить ${item.name}`}><Plus className="w-5 h-5" /></button>
  </article>;
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
