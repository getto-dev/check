import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { searchCatalog, type SearchSynonyms } from '@/lib/search';
import { formatCurrency } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';
import type { DatasetCategory } from '@/lib/dataset';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text: string, query: string): ReactNode => {
  const terms = [...new Set(query.trim().split(/\s+/).filter((term) => term.length >= 2))].sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.split(pattern).map((part, index) => {
    const isMatch = terms.some((term) => part.localeCompare(term, undefined, { sensitivity: 'accent' }) === 0);
    return isMatch ? <mark key={`${part}-${index}`} className="rounded-sm bg-primary/15 px-0.5 text-inherit">{part}</mark> : part;
  });
};

const Card = memo(function Card({ item, categoryName, searchQuery, onAdd, onOpen }: { item: CatalogItem; categoryName?: string; searchQuery: string; onAdd: () => void; onOpen: () => void }) {
  return (
    <article className="group flex items-center gap-3 border-b border-border/70 py-3.5 sm:py-4">
      <button type="button" className="min-w-0 flex-1 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onOpen} aria-label={`Открыть ${item.name}`}>
        <h3 className="font-bold leading-snug break-words">{highlightText(item.name, searchQuery)}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words line-clamp-2">{item.description}</p>
        <p className="text-[10px] leading-tight text-muted-foreground uppercase mt-1.5 break-words tracking-wide">{categoryName}</p>
      </button>
      <div className="shrink-0 flex items-center gap-3">
        <div className="text-right whitespace-nowrap">
          <div className="font-extrabold tabular-nums">{formatCurrency(item.priceKopecks)}</div>
          <div className="text-[10px] text-muted-foreground">за {item.unit}</div>
        </div>
        <button type="button" onClick={onAdd} className="w-11 h-11 shrink-0 rounded-full gradient-bg text-white flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform active:scale-95" aria-label={`Добавить ${item.name}`}>
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </article>
  );
});

interface CatalogListProps {
  catalogItems: CatalogItem[];
  categories: DatasetCategory[];
  synonyms?: SearchSynonyms;
}

export const CatalogList = memo(function CatalogList({ catalogItems, categories, synonyms }: CatalogListProps) {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const selectedCategory = useAppStore((state) => state.selectedCategory);
  const addItem = useAppStore((state) => state.addItem);
  const openModal = useAppStore((state) => state.openModal);
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const items = useMemo(
    () => searchCatalog(catalogItems, searchQuery, selectedCategory ?? undefined, synonyms, categories),
    [catalogItems, searchQuery, selectedCategory, synonyms, categories],
  );
  const add = useCallback((item: CatalogItem) => addItem(item), [addItem]);
  const open = useCallback((item: CatalogItem) => openModal(item), [openModal]);

  if (!items.length) return <div className="py-16 text-center text-muted-foreground">Ничего не найдено</div>;
  return <div role="list" className="divide-border">{items.map((item) => <div key={item.id} role="listitem"><Card item={item} categoryName={categoryNames.get(item.categoryId)} searchQuery={searchQuery} onAdd={() => add(item)} onOpen={() => open(item)} /></div>)}</div>;
});
