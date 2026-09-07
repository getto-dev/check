import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { InvoiceItem, Settings } from './types';
import { calculateTotals } from './format';

interface AppState {
  items: InvoiceItem[];
  settings: Settings;
  hydrated: boolean;
  addCatalogItem: (item: Pick<InvoiceItem, 'catalogId' | 'name' | 'description' | 'unit' | 'priceKopecks' | 'categoryId'>, quantity?: number) => void;
  addManualItem: (item: Omit<InvoiceItem, 'id'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setHydrated: (value: boolean) => void;
  totals: () => ReturnType<typeof calculateTotals>;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  items: [],
  settings: { address: '', discountPercent: 0 },
  hydrated: false,
  addCatalogItem: (catalogItem, quantity = 1) => set((state) => {
    const existing = state.items.find((item) => item.catalogId === catalogItem.catalogId && item.priceKopecks === catalogItem.priceKopecks);
    if (existing) return { items: state.items.map((item) => item.id === existing.id ? { ...item, quantity: Math.round((item.quantity + quantity) * 100) / 100 } : item) };
    return { items: [...state.items, { ...catalogItem, id: crypto.randomUUID(), quantity: Math.max(0.1, quantity), type: 'service' }] };
  }),
  addManualItem: (item) => set((state) => ({ items: [...state.items, { ...item, id: crypto.randomUUID() }] })),
  updateQuantity: (id, quantity) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, quantity: Math.max(0.1, Math.round(quantity * 100) / 100) } : item) })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
  updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
  setHydrated: (value) => set({ hydrated: value }),
  totals: () => calculateTotals(get().items, get().settings.discountPercent),
}), {
  name: 'santehschet-storage-v2',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ items: state.items, settings: state.settings }),
  onRehydrateStorage: () => (state) => state?.setHydrated(true),
}));
