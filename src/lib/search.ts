import type { CatalogItem } from './types';
import type { Service } from './catalog';

const STOP_WORDS = new Set(['с', 'в', 'на', 'по', 'и', 'к', 'о', 'у', 'за', 'из', 'от', 'до', 'для', 'без', 'под', 'над', 'при', 'через', 'а', 'но', 'или', 'не', 'же', 'бы', 'ли', 'уже', 'ещё', 'так', 'как', 'что', 'это', 'то', 'все']);
const SUFFIXES = ['ого', 'ому', 'ыми', 'ими', 'ость', 'ости', 'остью', 'ами', 'ями', 'ая', 'ее', 'ие', 'ий', 'им', 'их', 'ую', 'юю', 'ое', 'ые', 'ый', 'ым', 'ов', 'ев', 'ей', 'ой', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем', 'а', 'е', 'и', 'о', 'у', 'ы', 'ю', 'ь'];

export const stem = (word: string) => {
  let result = word.toLowerCase();
  for (const suffix of SUFFIXES) {
    if (result.endsWith(suffix) && result.length - suffix.length >= 3) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
};

export const tokenizeQuery = (query: string) => query
  .toLowerCase()
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .filter((word) => !STOP_WORDS.has(word))
  .map((word) => stem(word.replace(/[0-9øØ°№]/g, '')))
  .filter((word) => word.length >= 2);

const score = (item: Pick<CatalogItem, 'name' | 'description'>, query: string) => {
  if (!query.trim()) return 1;
  const text = `${item.name} ${item.description}`.toLowerCase();
  return tokenizeQuery(query).reduce((total, token) => total + (text.includes(token) ? (item.name.toLowerCase().includes(token) ? 10 : 4) : 0), 0);
};

type ScoredCatalogItem = CatalogItem & { score: number };

export const searchCatalog = (catalog: Record<string, Service[]>, query: string, categoryId?: string): CatalogItem[] => Object.entries(catalog)
  .flatMap(([category, items]) => categoryId && category !== categoryId ? [] : items.map((item): CatalogItem => ({ id: item.id, categoryId: category, name: item.n, description: item.d, unit: item.u, priceKopecks: item.p * 100 })))
  .map((item): ScoredCatalogItem => ({ ...item, score: score(item, query) }))
  .filter((item) => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(({ score: _score, ...item }) => item);
