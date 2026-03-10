import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { InvoiceItem, Settings, TabType, ThemeMode, Totals, CompressedItem, CatalogItem } from './types';
import { formatCurrency, calculateTotals } from './format';

const compressItems = (items: InvoiceItem[]): CompressedItem[] =>
  items.map((i) => ({
    i: i.catalogId ?? String(i.id),
    n: i.name,
    d: i.description,
    q: i.quantity,
    p: i.price,
    u: i.unit,
    t: i.type,
    c: i.category,
    a: i.amount,
  }));

const decompressItems = (data: CompressedItem[]): InvoiceItem[] =>
  data.map((i, index) => ({
    id: parseInt(i.i) || Date.now() + index,
    catalogId: i.i,
    name: i.n,
    description: i.d ?? '',
    quantity: i.q ?? 1,
    price: i.p ?? 0,
    unit: i.u ?? 'шт',
    type: i.t ?? 'service',
    category: i.c ?? '',
    amount: i.a ?? (i.q ?? 1) * (i.p ?? 0),
  }));

interface AppState {
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
  addItem: (item: CatalogItem, quantity?: number, price?: number) => void;
  addManualItem: (item: Omit<InvoiceItem, 'id' | 'amount'>) => void;
  updateQuantity: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearItems: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setTab: (tab: TabType) => void;
  setCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  openModal: (item: CatalogItem) => void;
  closeModal: () => void;
  setManualType: (type: 'service' | 'product') => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHydrated: (state: boolean) => void;
  calculateTotals: () => Totals;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      items: [],
      settings: { address: '', discount: 0 },
      themeMode: 'system',
      currentTab: 'catalog',
      selectedCategory: null,
      searchQuery: '',
      modalItem: null,
      modalOpen: false,
      manualType: 'service',
      hydrated: false,

      addItem: (item, quantity = 1, price = item.p) => {
        const { items } = get();
        const existingItem = items.find(
          (i) => i.catalogId === item.id && i.price === price
        );

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === existingItem.id
                ? { ...i, quantity: i.quantity + quantity, amount: (i.quantity + quantity) * i.price }
                : i
            ),
          });
          return;
        }

        const newItem: InvoiceItem = {
          id: Date.now(),
          catalogId: item.id,
          name: item.n,
          description: item.d,
          quantity,
          price,
          unit: item.u,
          type: 'service',
          category: item.catId,
          amount: quantity * price,
        };
        set({ items: [...items, newItem] });
      },

      addManualItem: (item) => {
        const { items } = get();
        const newItem: InvoiceItem = {
          ...item,
          id: Date.now(),
          amount: item.quantity * item.price,
        };
        set({ items: [...items, newItem] });
      },

      updateQuantity: (id, delta) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.max(1, item.quantity + delta),
                  amount: Math.max(1, item.quantity + delta) * item.price,
                }
              : item
          ),
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearItems: () => set({ items: [] }),

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setTab: (tab) => set({ currentTab: tab }),
      setCategory: (category) => set({ selectedCategory: category }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      openModal: (item) => set({ modalItem: item, modalOpen: true }),
      closeModal: () => set({ modalItem: null, modalOpen: false }),

      setManualType: (type) => set({ manualType: type }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setHydrated: (state) => set({ hydrated: state }),

      calculateTotals: () => {
        const { items, settings } = get();
        return calculateTotals(items, settings.discount);
      },
    }),
    {
      name: 'santech-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: compressItems(state.items),
        settings: state.settings,
        themeMode: state.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const rawItems = state.items as unknown as CompressedItem[];
          if (rawItems?.[0]?.i) {
            state.items = decompressItems(rawItems);
          }
          state.setHydrated(true);
        }
      },
    }
  )
);

// Re-export for convenience
export { formatCurrency } from './format';

export const haptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  const patterns: Record<string, number[]> = {
    light: [10],
    medium: [20],
    success: [10, 50, 10],
    error: [50, 50, 50],
  };
  navigator.vibrate(patterns[type]);
};

export const exportToPdf = async (items: InvoiceItem[], settings: Settings) => {
  const { exportToPdf: generatePdf } = await import('./pdf');
  return generatePdf(items, settings);
};
