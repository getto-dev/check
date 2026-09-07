import type { CatalogItem } from './types';

const RU_STOP_WORDS = new Set(['с','в','на','по','и','к','о','у','за','из','от','до','для','без','под','над','при','через','а','но','или','не','же','бы','ли','как']);
const SUFFIXES = ['ого','ему','ому','ыми','ими','ость','ости','ами','ями','ая','ее','ие','ий','им','их','ую','юю','ое','ые','ый','ым','ов','ев','ей','ой','ам','ям','ах','ях','ом','ем','а','е','и','о','у','ы','ю','ь'];
const STEM_ALIASES: Record<string, string[]> = {
  тепл: ['теплый','теплого','теплому','теплом','теплая'],
  труб: ['труба','трубы','трубу','трубой','трубопровод'],
  насо: ['насос','насоса','насосу','насосом'],
  радиат: ['радиатор','радиатора','радиатором','радиаторы'],
  смесит: ['смеситель','смесителя','смесителем','смесители'],
  канализ: ['канализация','канализации','канализацией'],
  водоснаб: ['водоснабжение','водоснабжения','водоснабжением'],
  отоплен: ['отопление','отопления','отоплением'],
};

export const normalizeWord = (word: string): string => {
  let value = word.toLowerCase().replace(/ё/g, 'е');
  for (const suffix of SUFFIXES) {
    if (value.endsWith(suffix) && value.length - suffix.length >= 3) return value.slice(0, -suffix.length);
  }
  return value;
};

export const tokenizeQuery = (query: string): string[] => query.toLowerCase().trim().split(/\s+/).filter(Boolean).filter((token) => !RU_STOP_WORDS.has(token)).map(normalizeWord);

const wordMatches = (stem: string, text: string): boolean => {
  const normalized = text.toLowerCase().replace(/ё/g, 'е');
  if (normalized.includes(stem)) return true;
  const aliases = STEM_ALIASES[stem] ?? [];
  return aliases.some((alias) => normalized.includes(alias));
};

export const searchCatalog = (catalog: CatalogItem[], query: string): CatalogItem[] => {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return [...catalog];
  return catalog.map((item) => {
    let score = 0;
    for (const token of tokens) {
      if (wordMatches(token, item.name)) score += 10;
      else if (wordMatches(token, item.description)) score += 4;
      else if (item.name.includes(token)) score += 2;
    }
    return { item, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ item }) => item);
};
