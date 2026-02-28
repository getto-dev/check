'use client';

import { memo, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/catalog';
import { Search, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchSectionProps {
  onManualClick: () => void;
}

export const SearchSection = memo(function SearchSection({ onManualClick }: SearchSectionProps) {
  const { selectedCategory, setCategory, searchQuery, setSearchQuery } = useAppStore();
  const [showClear, setShowClear] = useState(false);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setShowClear(value.length > 0);
  }, [setSearchQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setShowClear(false);
  }, [setSearchQuery]);

  const handleCategoryChange = useCallback((v: string) => {
    setCategory(v === 'all' ? null : v);
  }, [setCategory]);

  return (
    <section className="px-3 sm:px-4 py-3 sm:py-4 max-w-5xl mx-auto w-full">
      <div className="flex gap-2 sm:gap-2.5">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search 
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" 
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск услуг..."
            className={cn(
              'w-full pl-10 sm:pl-12 pr-10 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-medium',
              'bg-card border-2 border-border',
              'focus:outline-none focus:border-primary focus:shadow-lg focus:shadow-primary/25',
              'transition-all touch-manipulation'
            )}
            aria-label="Поиск услуг"
          />
          {showClear && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-muted-foreground text-white hover:bg-destructive active:scale-90 transition-all touch-manipulation"
              aria-label="Очистить поиск"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Manual Add Button */}
        <button
          onClick={onManualClick}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-sm font-bold whitespace-nowrap',
            'bg-card border-2 border-border',
            'hover:border-primary hover:text-primary active:scale-95 transition-all touch-manipulation'
          )}
          aria-label="Добавить свою позицию"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Своё</span>
        </button>
      </div>

      {/* Category Select */}
      <div className="mt-2.5 sm:mt-3">
        <Select 
          value={selectedCategory ?? 'all'} 
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger 
            className="w-full py-3 sm:py-3.5 rounded-2xl text-sm font-semibold bg-card border-2 border-border touch-manipulation"
            aria-label="Выбор категории"
          >
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-[50vh]">
            <SelectItem value="all" className="rounded-lg">
              Все категории
            </SelectItem>
            {Object.values(CATEGORIES).map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
});
