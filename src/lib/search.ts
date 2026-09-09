import type { CatalogItem } from './types';

const STOP_WORDS = new Set(['с', 'в', 'на', 'по', 'и', 'к', 'о', 'у', 'за', 'из', 'от', 'до', 'для', 'без', 'под', 'над', 'при', 'через', 'а', 'но', 'или', 'не', 'же', 'бы', 'ли', 'уже', 'ещё', 'так', 'как', 'что', 'это', 'то', 'все']);
const SUFFIXES = ['ого', 'ому', 'ыми', 'ими', 'ость', 'ости', 'остью', 'ами', 'ями', 'ая', 'ее', 'ие', 'ий', 'им', 'их', 'ую', 'юю', 'ое', 'ые', 'ый', 'ым', 'ов', 'ев', 'ей', 'ой', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем', 'а', 'е', 'и', 'о', 'у', 'ы', 'ю', 'ь'];

export interface SearchSynonyms {
  schemaVersion: number;
  groups: string[][];
}

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
  .map((word) => {
    const normalized = word.replace(/[øØ№]/g, '');
    return /^\d+(?:[.,]\d+)?$/.test(normalized) ? normalized.replace(',', '.') : stem(normalized);
  })
  .filter((word) => word.length >= 2);

const normalizePhrase = (phrase: string) => tokenizeQuery(phrase).join(' ');

const buildSynonymMap = (synonyms?: SearchSynonyms) => {
  const map = new Map<string, string[]>();
  if (!synonyms || synonyms.schemaVersion !== 1) return map;

  for (const group of synonyms.groups) {
    const normalized = group.map(normalizePhrase).filter(Boolean);
    for (const term of normalized) {
      map.set(term, normalized);
    }
  }
  return map;
};

const matchesToken = (text: string, token: string, synonymMap: Map<string, string[]>) => {
  if (text.includes(token)) return true;
  return (synonymMap.get(token) ?? []).some((alternative) => text.includes(alternative));
};

const score = (
  item: Pick<CatalogItem, 'name' | 'description'>,
  query: string,
  synonymMap: Map<string, string[]>,
) => {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return query.trim() ? 0 : 1;

  const name = tokenizeQuery(item.name).join(' ');
  const description = tokenizeQuery(item.description).join(' ');
  const text = `${name} ${description}`;
  const matchesAll = tokens.every((token) => matchesToken(text, token, synonymMap));
  if (!matchesAll) return 0;

  return tokens.reduce((total, token) => {
    const nameMatch = matchesToken(name, token, synonymMap);
    const exact = name.includes(token);
    return total + (exact ? 14 : nameMatch ? 10 : 4);
  }, 0);
};

type ScoredCatalogItem = CatalogItem & { score: number };

const withoutScore = (scored: ScoredCatalogItem): CatalogItem => {
  const { score: itemScore, ...item } = scored;
  void itemScore;
  return item;
};

export const searchCatalog = (
  catalog: CatalogItem[],
  query: string,
  categoryId?: string,
  synonyms?: SearchSynonyms,
): CatalogItem[] => {
  const synonymMap = buildSynonymMap(synonyms);
  return catalog
    .filter((item) => !categoryId || item.categoryId === categoryId)
    .map((item): ScoredCatalogItem => ({ ...item, score: score(item, query, synonymMap) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(withoutScore);
};
