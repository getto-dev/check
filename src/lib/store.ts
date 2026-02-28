import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { InvoiceItem, Settings, TabType, ThemeMode, Totals, CompressedItem, CatalogItem } from './types';

// ==================== Утилиты сжатия данных ====================
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
    amount: i.a ?? i.q * i.p ?? 0,
  }));

// ==================== Типы состояния ====================
interface AppState {
  // State
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

  // Item actions
  addItem: (item: CatalogItem, quantity?: number, price?: number) => void;
  addManualItem: (item: Omit<InvoiceItem, 'id' | 'amount'>) => void;
  updateQuantity: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearItems: () => void;
  importItems: (items: InvoiceItem[], settings: Settings) => void;

  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;

  // Navigation actions
  setTab: (tab: TabType) => void;
  setCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Modal actions
  openModal: (item: CatalogItem) => void;
  closeModal: () => void;

  // Manual type
  setManualType: (type: 'service' | 'product') => void;

  // Theme
  setThemeMode: (mode: ThemeMode) => void;

  // Hydration
  setHydrated: (state: boolean) => void;

  // Computed
  calculateTotals: () => Totals;
}

// ==================== Селекторы для оптимизации ====================
export const selectItems = (state: AppState) => state.items;
export const selectSettings = (state: AppState) => state.settings;
export const selectHydrated = (state: AppState) => state.hydrated;
export const selectCurrentTab = (state: AppState) => state.currentTab;
export const selectThemeMode = (state: AppState) => state.themeMode;

// ==================== Store ====================
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Добавление товара из каталога
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

      // Добавление вручную
      addManualItem: (item) => {
        const { items } = get();
        const newItem: InvoiceItem = {
          ...item,
          id: Date.now(),
          amount: item.quantity * item.price,
        };
        set({ items: [...items, newItem] });
      },

      // Обновление количества
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

      // Удаление товара
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      // Очистка всех товаров
      clearItems: () => set({ items: [] }),

      // Импорт данных
      importItems: (items, settings) => set({ items, settings }),

      // Обновление настроек
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Навигация
      setTab: (tab) => set({ currentTab: tab }),
      setCategory: (category) => set({ selectedCategory: category }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Модальное окно
      openModal: (item) => set({ modalItem: item, modalOpen: true }),
      closeModal: () => set({ modalItem: null, modalOpen: false }),

      // Тип ручного добавления
      setManualType: (type) => set({ manualType: type }),

      // Тема
      setThemeMode: (mode) => set({ themeMode: mode }),

      // Гидратация
      setHydrated: (state) => set({ hydrated: state }),

      // Расчет итогов (мемоизированный через вызов)
      calculateTotals: () => {
        const { items, settings } = get();
        const services = items.filter((i) => i.type === 'service');
        const products = items.filter((i) => i.type === 'product');
        const subtotalServices = services.reduce((s, i) => s + i.amount, 0);
        const subtotalProducts = products.reduce((s, i) => s + i.amount, 0);
        const discountAmount = Math.round(subtotalServices * (settings.discount / 100));
        const grandTotal = subtotalServices - discountAmount + subtotalProducts;
        return { subtotalServices, subtotalProducts, discountAmount, grandTotal };
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

// ==================== Утилиты ====================
export const formatCurrency = (value: number): string => 
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);

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

// ==================== Экспорт в HTML ====================
export const exportToHtml = (items: InvoiceItem[], settings: Settings) => {
  const d = new Date();
  const num = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}-01`;

  const services = items.filter((i) => i.type === 'service');
  const products = items.filter((i) => i.type === 'product');
  const subtotalServices = services.reduce((s, i) => s + i.amount, 0);
  const subtotalProducts = products.reduce((s, i) => s + i.amount, 0);
  const discountAmount = Math.round(subtotalServices * (settings.discount / 100));
  const grandTotal = subtotalServices - discountAmount + subtotalProducts;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Счет на оплату №${num}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 8px; color: #333; background: white; font-size: 9pt; }
        .invoice-box { max-width: 100%; margin: 0 auto; }
        .header-row { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #8b5cf6; padding-bottom: 4px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .title { font-size: 16pt; color: #8b5cf6; font-weight: 700; }
        .header-item { font-size: 9pt; }
        .label { color: #555; font-size: 7pt; text-transform: uppercase; font-weight: 700; margin-right: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
        th { border-bottom: 2px solid #333; padding: 4px 6px; font-size: 8pt; text-transform: uppercase; text-align: left; font-weight: 700; }
        td { padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 9pt; vertical-align: middle; line-height: 1.3; }
        .col-name { width: 73%; text-align: left; }
        .col-qty { width: 7%; text-align: center; white-space: nowrap; }
        .col-price { width: 10%; text-align: center; white-space: nowrap; }
        .col-total { width: 10%; text-align: center; white-space: nowrap; }
        .desc-text { display: inline; color: #777; font-size: 8pt; font-weight: 400; margin-left: 4px; }
        .desc-text::before { content: '('; }
        .desc-text::after { content: ')'; }
        .desc-text:empty::before, .desc-text:empty::after { content: none; }
        .col-name strong { font-weight: 600; }
        .subtotal-row td { font-size: 8pt; color: #444; text-align: right; background: #f7f7f7; border: none; padding-right: 10px; }
        .total-block { margin-top: 8px; padding-top: 6px; border-top: 2px solid #8b5cf6; display: flex; flex-direction: column; align-items: flex-end; }
        .summary-line { display: flex; justify-content: space-between; width: min(260px, 100%); margin-bottom: 4px; font-size: 9pt; gap: 16px; }
        .discount-text { color: #ef4444; font-weight: 700; }
        .grand-total { margin-top: 2px; padding-top: 4px; border-top: 1px solid #eee; font-size: 11pt; font-weight: 700; color: #8b5cf6; }
        .grand-total .label-text { color: #333; font-size: 8pt; text-transform: uppercase; }
        @media print { body { padding: 5mm; } tr { page-break-inside: avoid; } }
        @media (max-width: 480px) { .col-name { width: 65%; } .col-qty, .col-price, .col-total { width: 12%; } }
    </style>
</head>
<body>
<div class="invoice-box">
    <div class="header-row">
        <div class="title">СЧЕТ №${num}</div>
        <div class="header-item">
            <span class="label">Объект:</span>
            <span>${settings.address || 'не указан'}</span>
        </div>
    </div>
    ${services.length ? `
    <table>
        <thead><tr><th class="col-name">РАБОТЫ И УСЛУГИ</th><th class="col-qty">Кол.</th><th class="col-price">Цена</th><th class="col-total">Всего</th></tr></thead>
        <tbody>
        ${services.map((i) => `<tr><td class="col-name"><strong>${i.name}</strong><span class="desc-text">${i.description || ''}</span></td><td class="col-qty">${i.quantity} ${i.unit}</td><td class="col-price">${formatCurrency(i.price)}</td><td class="col-total">${formatCurrency(i.amount)}</td></tr>`).join('\n        ')}
        <tr class="subtotal-row"><td colspan="4">Итого за услуги: ${formatCurrency(subtotalServices)}</td></tr>
        </tbody>
    </table>` : ''}
    ${products.length ? `
    <table>
        <thead><tr><th class="col-name">МАТЕРИАЛЫ И ТОВАРЫ</th><th class="col-qty">Кол.</th><th class="col-price">Цена</th><th class="col-total">Всего</th></tr></thead>
        <tbody>
        ${products.map((i) => `<tr><td class="col-name"><strong>${i.name}</strong><span class="desc-text">${i.description || ''}</span></td><td class="col-qty">${i.quantity} ${i.unit}</td><td class="col-price">${formatCurrency(i.price)}</td><td class="col-total">${formatCurrency(i.amount)}</td></tr>`).join('\n        ')}
        <tr class="subtotal-row"><td colspan="4">Итого за материалы: ${formatCurrency(subtotalProducts)}</td></tr>
        </tbody>
    </table>` : ''}
    <div class="total-block">
        ${settings.discount > 0 ? `<div class="summary-line"><span>Скидка на работы (${settings.discount}%):</span><span class="discount-text">− ${formatCurrency(discountAmount)}</span></div>` : ''}
        <div class="summary-line grand-total"><span class="label-text">ИТОГО К ОПЛАТЕ:</span><span>${formatCurrency(grandTotal)}</span></div>
    </div>
</div>
<script id="santech-data" type="application/json">${JSON.stringify({ items: compressItems(items), settings })}</script>
</body>
</html>`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  link.download = `Smeta_${num}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
};
