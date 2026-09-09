import type { DatasetCategory } from './dataset';
import type { CatalogItem } from './types';

const STOP_WORDS = new Set(['с', 'в', 'на', 'по', 'и', 'к', 'о', 'у', 'за', 'из', 'от', 'до', 'для', 'без', 'под', 'над', 'при', 'через', 'а', 'но', 'или', 'не', 'же', 'бы', 'ли', 'уже', 'ещё', 'так', 'как', 'что', 'это', 'то', 'все']);
const SUFFIXES = ['ого', 'ому', 'ыми', 'ими', 'остью', 'ость', 'ости', 'ами', 'ями', 'ая', 'ее', 'ие', 'ий', 'им', 'их', 'ую', 'юю', 'ое', 'ые', 'ый', 'ым', 'ов', 'ев', 'ей', 'ой', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем', 'а', 'е', 'и', 'о', 'у', 'ы', 'ю', 'ь'];

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
  .replace(/[–—−]/g, '-')
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

type SynonymConcept = { id: number; terms: string[]; tokens: string[] };

const buildSynonymIndex = (synonyms?: SearchSynonyms) => {
  const tokenToConcepts = new Map<string, number[]>();
  const concepts: SynonymConcept[] = [];
  if (!synonyms || synonyms.schemaVersion !== 1) return { tokenToConcepts, concepts };

  synonyms.groups.forEach((group, id) => {
    const terms = group.map(normalizePhrase).filter(Boolean);
    const tokens = [...new Set(terms.flatMap((term) => term.split(' ')))];
    if (!tokens.length) return;
    concepts.push({ id, terms, tokens });
    for (const token of tokens) tokenToConcepts.set(token, [...(tokenToConcepts.get(token) ?? []), id]);
  });
  return { tokenToConcepts, concepts };
};

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length] ?? 2;
};

const tokenMatch = (textTokens: string[], queryToken: string) => {
  if (textTokens.some((token) => token.includes(queryToken))) return 'partial' as const;
  if (queryToken.length >= 4 && textTokens.some((token) => levenshtein(token, queryToken) <= 1)) return 'typo' as const;
  return 'none' as const;
};

const conceptForToken = (token: string, index: ReturnType<typeof buildSynonymIndex>) => {
  const direct = index.tokenToConcepts.get(token);
  if (direct?.length) return direct[0];
  if (token.length < 4) return undefined;
  return index.concepts.find((concept) => concept.tokens.some((candidate) => levenshtein(candidate, token) <= 1))?.id;
};

const conceptMatches = (textTokens: string[], concept: SynonymConcept) => concept.terms.some((term) => term.split(' ').every((token) => tokenMatch(textTokens, token) !== 'none'));

const score = (
  item: Pick<CatalogItem, 'name' | 'description' | 'categoryId'>,
  query: string,
  synonymIndex: ReturnType<typeof buildSynonymIndex>,
  categoryNames: Map<string, string>,
) => {
  const queryTokens = tokenizeQuery(query);
  if (!queryTokens.length) return query.trim() ? 0 : 1;

  const nameTokens = tokenizeQuery(item.name);
  const descriptionTokens = tokenizeQuery(item.description);
  const categoryTokens = tokenizeQuery(categoryNames.get(item.categoryId) ?? '');
  const allTokens = [...nameTokens, ...descriptionTokens, ...categoryTokens];
  const concepts = new Set<number>();
  const requiredTokens = queryTokens.filter((token) => {
    const conceptId = conceptForToken(token, synonymIndex);
    if (conceptId !== undefined) {
      concepts.add(conceptId);
      return false;
    }
    return true;
  });

  if (!requiredTokens.every((token) => tokenMatch(allTokens, token) !== 'none')) return 0;
  if (![...concepts].every((id) => {
    const concept = synonymIndex.concepts.find((candidate) => candidate.id === id);
    return concept ? conceptMatches(allTokens, concept) : false;
  })) return 0;

  return queryTokens.reduce((total, token) => {
    const nameMatch = tokenMatch(nameTokens, token);
    const allMatch = tokenMatch(allTokens, token);
    if (nameTokens.includes(token)) return total + 30;
    if (nameMatch === 'partial') return total + 22;
    if (nameMatch === 'typo') return total + 18;
    if (allMatch === 'partial') return total + 12;
    if (allMatch === 'typo') return total + 9;
    return total + 8;
  }, 0);
};

type ScoredCatalogItem = CatalogItem & { score: number };

const withoutScore = (scored: ScoredCatalogItem): CatalogItem => {
  const { score: _score, ...item } = scored;
  return item;
};

export const searchCatalog = (
  catalog: CatalogItem[],
  query: string,
  categoryId?: string,
  synonyms?: SearchSynonyms,
  categories: DatasetCategory[] = [],
): CatalogItem[] => {
  const synonymIndex = buildSynonymIndex(synonyms);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return catalog
    .filter((item) => !categoryId || item.categoryId === categoryId)
    .map((item): ScoredCatalogItem => ({ ...item, score: score(item, query, synonymIndex, categoryNames) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(withoutScore);
};
