'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { DatasetCategory } from '@/lib/dataset';
import { cn } from '@/lib/utils';

export const SearchSection = memo(function SearchSection({ onManualClick, categories }: { onManualClick: () => void; categories: DatasetCategory[] }) {
  const selectedCategory = useAppStore((state) => state.selectedCategory);
  const setCategory = useAppStore((state) => state.setCategory);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const categoryRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = selectedCategory ? categories.findIndex((category) => category.id === selectedCategory) + 1 : 0;
  const displayIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedLabel = displayIndex === 0 ? 'Все категории' : categories[displayIndex - 1]?.name ?? 'Все категории';

  const closeCategory = useCallback(() => {
    setCategoryOpen(false);
    setActiveIndex(displayIndex);
  }, [displayIndex]);

  const selectCategory = useCallback((index: number) => {
    setCategory(index === 0 ? null : categories[index - 1]?.id ?? null);
    setCategoryOpen(false);
    setActiveIndex(index);
  }, [categories, setCategory]);

  const handleCategoryKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setCategoryOpen(true);
      setActiveIndex((index) => event.key === 'ArrowDown' ? Math.min(index + 1, categories.length) : Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setCategoryOpen((open) => !open);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCategory();
    }
  }, [categories.length, closeCategory]);

  useEffect(() => {
    if (!categoryOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) closeCategory();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCategory();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setActiveIndex((index) => {
          if (event.key === 'Home') return 0;
          if (event.key === 'End') return categories.length;
          return event.key === 'ArrowDown' ? Math.min(index + 1, categories.length) : Math.max(index - 1, 0);
        });
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCategory(activeIndex);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, categories.length, categoryOpen, closeCategory, selectCategory]);

  useEffect(() => {
    if (categoryOpen) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, categoryOpen]);

  return (
    <section className="px-3 sm:px-4 pt-4 pb-2 sm:pt-6 sm:pb-3 max-w-5xl mx-auto w-full">
      <div className="mb-3 sm:mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Каталог</p>
      </div>
      <div className="flex gap-2 sm:gap-2.5 items-stretch">
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск услуг и материалов" className={cn('w-full min-w-0 pl-10 sm:pl-12 pr-12 py-3 sm:py-3.5 min-h-11 rounded-xl text-sm sm:text-base font-medium bg-card border border-border', 'focus:outline-none focus:border-primary transition-all touch-manipulation')} aria-label="Поиск услуг и материалов" enterKeyHint="search" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Очистить поиск"><span className="w-7 h-7 flex items-center justify-center rounded-full bg-muted-foreground text-white"><X className="w-3.5 h-3.5" /></span></button>}
        </div>
        <button type="button" onClick={onManualClick} className="shrink-0 flex items-center justify-center gap-2 min-w-11 min-h-11 px-3.5 py-3 rounded-xl text-sm font-bold whitespace-nowrap bg-card border border-border hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Добавить свою позицию"><Plus className="w-5 h-5 shrink-0" /><span className="hidden sm:inline">Своя позиция</span></button>
      </div>

      <div className="mt-2.5 relative" ref={categoryRef}>
        <button type="button" className="w-full min-h-11 px-3.5 sm:px-4 rounded-xl text-sm font-semibold bg-transparent border border-border flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-haspopup="listbox" aria-expanded={categoryOpen} aria-controls="category-listbox" aria-label="Выбор категории" onClick={() => setCategoryOpen((open) => !open)} onKeyDown={handleCategoryKeyDown}>
          <span className="truncate min-w-0">{selectedLabel}</span>
          <ChevronDown className={cn('w-5 h-5 shrink-0 transition-transform', categoryOpen && 'rotate-180')} aria-hidden="true" />
        </button>

        {categoryOpen && <div id="category-listbox" role="listbox" aria-label="Категории услуг" className="absolute z-30 left-0 right-0 mt-2 max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-1 shadow-xl">
          <button ref={(element) => { optionRefs.current[0] = element; }} type="button" role="option" aria-selected={selectedIndex === 0} onClick={() => selectCategory(0)} className={cn('w-full min-h-11 px-3 rounded-lg flex items-center justify-between gap-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', activeIndex === 0 && 'bg-accent')}><span>Все категории</span>{selectedIndex === 0 && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}</button>
          {categories.map((category, index) => { const optionIndex = index + 1; const selected = selectedCategory === category.id; return <button key={category.id} ref={(element) => { optionRefs.current[optionIndex] = element; }} type="button" role="option" aria-selected={selected} onClick={() => selectCategory(optionIndex)} className={cn('w-full min-h-11 px-3 rounded-lg flex items-center justify-between gap-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', activeIndex === optionIndex && 'bg-accent')}><span>{category.name}</span>{selected && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}</button>; })}
        </div>}
      </div>
    </section>
  );
});
