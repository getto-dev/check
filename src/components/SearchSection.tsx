'use client';

import { memo, useCallback } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export const SearchSection = memo(function SearchSection({
  onManualClick,
}: {
  onManualClick: () => void;
}) {
  const { selectedCategory, setCategory, searchQuery, setSearchQuery } = useAppStore();
  const handleClear = useCallback(() => setSearchQuery(''), [setSearchQuery]);

  return (
    <section className="px-3 sm:px-4 py-3 sm:py-4 max-w-5xl mx-auto w-full">
      <div className="flex gap-2 sm:gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск услуг..."
            className={cn(
              'w-full pl-10 sm:pl-12 pr-10 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-medium',
              'bg-card border-2 border-border',
              'focus:outline-none focus:border-primary transition-all touch-manipulation',
            )}
            aria-label="Поиск услуг"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-muted-foreground text-white"
              aria-label="Очистить поиск"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onManualClick}
          className="flex items-center gap-2 px-3.5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap bg-card border-2 border-border hover:border-primary hover:text-primary"
          aria-label="Добавить свою позицию"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Своё</span>
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor="category" className="sr-only">
          Выбор категории
        </label>
        <select
          id="category"
          value={selectedCategory ?? 'all'}
          onChange={(e) => setCategory(e.target.value === 'all' ? null : e.target.value)}
          className="w-full h-10 px-3 py-3.5 rounded-2xl text-sm font-semibold bg-card border-2 border-border focus:outline-none focus:border-primary"
          aria-label="Выбор категории"
        >
          <option value="all">Все категории</option>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
});
