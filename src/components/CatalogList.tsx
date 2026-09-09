import { memo, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { searchCatalog } from '@/lib/search';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';
import type { DatasetCategory } from '@/lib/dataset';

const Card = memo(function Card({ item, categoryName, onAdd, onOpen }: { item: CatalogItem; categoryName?: string; onAdd: () => void; onOpen: () => void }) {
  return (
    <article className="group flex items-center gap-3 border-b border-border/70 py-3.5 sm:py-4">
      <button
        type="button"
        className="min-w-0 flex-1 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onOpen}
        aria-label={`Открыть ${item.name}`}
      >
        <h3 className="font-bold leading-snug break-words">{item.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words line-clamp-2">{item.description}</p>
        <p className="text-[10px] leading-tight text-muted-foreground uppercase mt-1.5 break-words tracking-wide">{categoryName}</p>
      </button>

      <div className="shrink-0 flex items-center gap-3">
        <div className="text-right whitespace-nowrap">
          <div className="font-extrabold tabular-nums">{formatCurrency(item.priceKopecks)}</div>
          <div className="text-[10px] text-muted-foreground">за {item.unit}</div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="w-11 h-11 shrink-0 rounded-full gradient-bg text-white flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform active:scale-95"
          aria-label={`Добавить ${item.name}`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </article>
  );
});

export const CatalogList = memo(function CatalogList({ catalogItems, categories }: { catalogItems: CatalogItem[]; categories: DatasetCategory[] }) {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const selectedCategory = useAppStore((state) => state.selectedCategory);
  const addItem = useAppStore((state) => state.addItem);
  const openModal = useAppStore((state) => state.openModal);
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const items = useMemo(() => searchCatalog(catalogItems, searchQuery, selectedCategory ?? undefined), [catalogItems, searchQuery, selectedCategory]);
  const add = useCallback((item: CatalogItem) => addItem(item), [addItem]);
  const open = useCallback((item: CatalogItem) => openModal(item), [openModal]);

  if (!items.length) return <div className="py-16 text-center text-muted-foreground">Ничего не найдено</div>;
  return <div role="list" className="divide-border">{items.map((item) => <div key={item.id} role="listitem"><Card item={item} categoryName={categoryNames.get(item.categoryId)} onAdd={() => add(item)} onOpen={() => open(item)} /></div>)}</div>;
});
