'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CatalogItem, InvoiceItem, Settings, ThemeMode, TabType } from './types';
import { calculateTotals } from './format';
import { MAX_DISCOUNT_PERCENT } from './constants';

interface State {
  items: InvoiceItem[];
  settings: Settings;
  themeMode: ThemeMode;
  currentTab: TabType;
  selectedCategory: string | null;
  searchQuery: string;
  modalItem: CatalogItem | null;
  modalOpen: boolean;
  manualType: 'service' | 'product';
  hydrated: boolean;
  addItem: (item: CatalogItem, qty?: number, priceKopecks?: number) => void;
  addCatalogItem: (item: CatalogItem, qty?: number) => void;
  addManualItem: (item: Omit<InvoiceItem, 'id'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  changeQuantity: (id: string, direction: -1 | 1) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  updateSettings: (settings: Partial<Settings> & { discount?: number }) => void;
  setTab: (tab: TabType) => void;
  setCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  openModal: (item: CatalogItem) => void;
  closeModal: () => void;
  setManualType: (type: 'service' | 'product') => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHydrated: (value: boolean) => void;
  calculateTotals: () => ReturnType<typeof calculateTotals>;
  loadEstimateData: (items: InvoiceItem[], settings: Settings) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeQuantity = (value: number) => Math.max(0.1, Math.round(value * 100) / 100);
const quantityStep = (quantity: number, direction: -1 | 1) => {
  if (direction === -1) return quantity > 1 ? 1 : 0.1;
  return quantity >= 1 ? 1 : 0.1;
};

const normalizeSettings = (settings: Partial<Settings> & { discount?: number }): Settings => {
  const discountPercent = typeof settings.discount === 'number' ? settings.discount : settings.discountPercent;
  return {
    address: typeof settings.address === 'string' ? settings.address : '',
    discountPercent: clamp(Number(discountPercent) || 0, 0, MAX_DISCOUNT_PERCENT),
  };
};

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      settings: { address: '', discountPercent: 0 },
      themeMode: 'system',
      currentTab: 'catalog',
      selectedCategory: null,
      searchQuery: '',
      modalItem: null,
      modalOpen: false,
      manualType: 'service',
      hydrated: false,

      addItem: (item, qty = 1, priceKopecks = item.priceKopecks) => set((state) => {
        const quantity = normalizeQuantity(qty);
        const existing = state.items.find(
          (entry) => entry.catalogId === item.id
            && entry.priceKopecks === priceKopecks
            && entry.type === 'service',
        );
        if (existing) {
          return { items: state.items.map((entry) => entry.id === existing.id ? { ...entry, quantity: normalizeQuantity(entry.quantity + quantity) } : entry) };
        }
        return {
          items: [...state.items, {
            id: crypto.randomUUID(),
            catalogId: item.id,
            name: item.name,
            description: item.description,
            quantity,
            priceKopecks,
            unit: item.unit,
            type: 'service',
            categoryId: item.categoryId,
          }],
        };
      }),

      addCatalogItem: (item, qty = 1) => get().addItem(item, qty),
      addManualItem: (item) => set((state) => ({ items: [...state.items, { ...item, id: crypto.randomUUID() }] })),
      updateQuantity: (id, quantity) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, quantity: normalizeQuantity(quantity) } : item) })),
      changeQuantity: (id, direction) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id !== id) return item;
          const step = quantityStep(item.quantity, direction);
          return { ...item, quantity: normalizeQuantity(item.quantity + direction * step) };
        }),
      })),
      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clearItems: () => set({ items: [] }),

      updateSettings: (patch) => set((state) => ({ settings: normalizeSettings({ ...state.settings, ...patch }) })),
      setTab: (tab) => set({ currentTab: tab }),
      setCategory: (category) => set({ selectedCategory: category }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      openModal: (item) => set({ modalItem: item, modalOpen: true }),
      closeModal: () => set({ modalItem: null, modalOpen: false }),
      setManualType: (type) => set({ manualType: type }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setHydrated: (value) => set({ hydrated: value }),
      calculateTotals: () => calculateTotals(get().items, get().settings.discountPercent),
      loadEstimateData: (items, settings) => set({ items, settings: normalizeSettings(settings) }),
    }),
    {
      name: 'santehschet-storage-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, settings: state.settings, themeMode: state.themeMode }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<State> | undefined;
        return {
          ...currentState,
          ...persisted,
          settings: normalizeSettings(persisted?.settings ?? currentState.settings),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export const haptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  const patterns = { light: [10], medium: [20], success: [10, 50, 10], error: [50, 50, 50] };
  navigator.vibrate(patterns[type]);
};

export { formatCurrency, formatQuantity } from './format';

export const exportToPdf = async (items: InvoiceItem[], settings: Settings) => {
  const { exportToPdf: pdf } = await import('./pdf');
  return pdf(items, settings);
};
