import { Category, CatalogItem } from './types';

// Типы данных
export interface Service {
  id: string;
  n: string;  // name
  d: string;  // description
  u: string;  // unit
  p: number;  // price
}

export interface CatalogData {
  version: string;
  updated: string;
  categories: Category[];
  services: Record<string, Service[]>;
}

// URL для загрузки прайс-листа
const CATALOG_URL = 'https://raw.githubusercontent.com/getto-dev/price-data/main/catalog.json';

// Кэшированные данные
let cachedData: CatalogData | null = null;

// Загрузка прайс-листа
export async function loadCatalog(): Promise<CatalogData> {
  if (cachedData) return cachedData;
  
  const response = await fetch(CATALOG_URL);
  if (!response.ok) throw new Error('Failed to load catalog');
  
  cachedData = await response.json();
  return cachedData!;
}

// Синхронный доступ к кэшированным данным
export function getCatalog(): CatalogData | null {
  return cachedData;
}

// Категории услуг (fallback для SSR)
export const CATEGORIES: Record<string, Category> = {
  heating: { id: 'heating', name: 'Отопление' },
  floor_heat: { id: 'floor_heat', name: 'Теплый пол' },
  water: { id: 'water', name: 'Водоснабжение' },
  boilers: { id: 'boilers', name: 'Котельные' },
  chimneys: { id: 'chimneys', name: 'Дымоходы' },
  sewerage: { id: 'sewerage', name: 'Канализация' },
  pipes: { id: 'pipes', name: 'Прокладка труб' },
  filtration: { id: 'filtration', name: 'Водоочистка' },
  automation: { id: 'automation', name: 'Автоматика' },
  grooving: { id: 'grooving', name: 'Штробление и бурение' },
  service: { id: 'service', name: 'Сервис и ремонт' },
  plumbing: { id: 'plumbing', name: 'Чистовая сантехника' },
};

// Преобразование в формат CatalogItem
export function getCatalogItems(catalogData: CatalogData | null): Record<string, Omit<CatalogItem, 'catId'>[]> {
  if (!catalogData) return {};
  
  const result: Record<string, Omit<CatalogItem, 'catId'>[]> = {};
  for (const [catId, services] of Object.entries(catalogData.services)) {
    result[catId] = services.map(s => ({
      id: s.id,
      n: s.n,
      d: s.d,
      u: s.u,
      p: s.p,
    }));
  }
  return result;
}

// Создаем индекс для быстрого поиска
export const createCatalogIndex = (catalogData: CatalogData | null): Record<string, CatalogItem> => {
  if (!catalogData) return {};
  
  const index: Record<string, CatalogItem> = {};
  Object.entries(catalogData.services).forEach(([catId, items]) => {
    items.forEach((item) => {
      index[item.id] = { ...item, catId };
    });
  });
  return index;
};

// Экспорт для совместимости (будет обновлён после загрузки)
export let CATALOG: Record<string, Omit<CatalogItem, 'catId'>[]> = {};
export let catalogIndex: Record<string, CatalogItem> = {};

// Инициализация данных
export async function initCatalog() {
  try {
    const data = await loadCatalog();
    CATALOG = getCatalogItems(data);
    catalogIndex = createCatalogIndex(data);
    return data;
  } catch (error) {
    console.error('Failed to load catalog:', error);
    return null;
  }
}
