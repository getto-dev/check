/**
 * Advanced search utility for catalog items.
 * 
 * Features:
 * - Tokenized multi-word search with intelligent ranking
 * - Russian morphological normalization (stemming-like)
 * - Stop words filtering (prepositions, conjunctions)
 * - Number extraction and matching (e.g. "110" matches "Ø110")
 * - Trigram fuzzy matching for typo tolerance
 * - Synonym/alias expansion for plumbing terms
 * - Category name matching
 * - Relevance scoring (name match > description match, exact > partial)
 * - Safe regex escaping for highlight function
 */

/**
 * Russian stop words — prepositions, conjunctions, particles.
 * These are filtered out from search queries because they carry no semantic meaning
 * and often cause false negatives when the same preposition is used differently
 * in the catalog item name (e.g. "пол с насосом" vs "пола с насосом").
 */
const STOP_WORDS = new Set([
  'с', 'в', 'на', 'по', 'и', 'к', 'о', 'у', 'за', 'из', 'от',
  'до', 'для', 'без', 'под', 'над', 'при', 'через', 'а', 'но',
  'или', 'не', 'же', 'бы', 'ли', 'уже', 'ещё', 'так', 'как',
  'что', 'это', 'то', 'все', 'он', 'она', 'они', 'мы', 'вы',
]);

/**
 * Common Russian suffixes for basic stemming normalization.
 * We strip these suffixes to match different word forms
 * (e.g. "теплый" → "тепл", "теплого" → "тепл", "теплому" → "тепл")
 */
const RU_SUFFIXES = [
  // Long adjective endings (remove first to avoid partial matches)
  'ого', 'ому', 'ыми', 'ими', 'ость', 'ости', 'остью',
  'ами', 'ями',
  // Shorter adjective/noun endings
  'ая',  'ее',  'ие',  'ий',  'им',  'их',  'ую',  'юю',
  'ое',  'ые',  'ый',  'ым',  'их',
  'ов',  'ев',  'ей',  'ий',  'ый',  'ой',
  'ам',  'ям',  'ах',  'ях',  'ом',  'ем',
  // Short endings (single char - only remove if stem >= 3 chars)
  'а',   'е',   'и',   'о',   'у',   'ы',  'ю',  'ь',
];

/**
 * Known synonym/alias mappings for common plumbing terms.
 * Maps a normalized stem to alternative forms that should also match.
 * Expanded significantly for better coverage.
 */
const SYNONYMS: Record<string, string[]> = {
  'тепл':    ['теплого', 'теплому', 'теплым', 'теплом', 'теплая', 'теплой', 'теплые'],
  'пол':     ['пола', 'полу', 'полом', 'полы'],
  'насос':   ['насосом', 'насоса', 'насосу', 'насосы'],
  'труб':    ['труба', 'трубы', 'трубу', 'трубой', 'трубопровода', 'трубопровод'],
  'коллект': ['коллектора', 'коллектору', 'коллектором', 'коллекторы'],
  'котел':   ['котла', 'котлу', 'котлом', 'котлы', 'котельн'],
  'котельн': ['котельная', 'котельной', 'котельную'],
  'радиат':  ['радиатора', 'радиатору', 'радиатором', 'радиаторы'],
  'смесит':  ['смесителя', 'смесителю', 'смесителем', 'смесители'],
  'фильтр':  ['фильтра', 'фильтру', 'фильтром', 'фильтры'],
  'кран':    ['крана', 'крану', 'краном', 'краны'],
  'бойлер':  ['бойлера', 'бойлеру', 'бойлером', 'бойлеры'],
  'канализ': ['канализация', 'канализации', 'канализацией'],
  'водоснаб': ['водоснабжение', 'водоснабжения', 'водоснабжением'],
  'отоплен': ['отопление', 'отопления', 'отоплением'],
  'дымоход': ['дымохода', 'дымоходу', 'дымоходом', 'дымоходы'],
  'монтаж':  ['монтажа', 'монтажу', 'монтажом', 'монтажи'],
  'установ': ['установка', 'установки', 'установку', 'установкой', 'установок'],
  'штроб':   ['штроба', 'штробы', 'штробу', 'штробой', 'штробление'],
  'стояк':   ['стояка', 'стояку', 'стояком', 'стояки'],
  'завес':   ['завесы', 'завесу', 'завесой'],
  'фанкойл': ['фанкойла', 'фанкойлу', 'фанкойлом', 'фанкойлы'],
  'конвект': ['конвектора', 'конвектору', 'конвектором', 'конвекторы'],
  'унитаз':  ['унитаза', 'унитазу', 'унитазом', 'унитазы'],
  'раковин': ['раковина', 'раковины', 'раковину', 'раковиной'],
  'ванн':    ['ванна', 'ванны', 'ванну', 'ванной'],
  'душ':     ['душа', 'душу', 'душем', 'души'],
  'трап':    ['трапа', 'трапу', 'трапом', 'трапы'],
  'счёт':    ['счетчик', 'счетчика', 'счетчику', 'счетчики'],
  'шкав':    ['шкаф', 'шкафа', 'шкафу', 'шкафы', 'шкафом'],
  'редукт':  ['редуктора', 'редуктору', 'редуктором', 'редукторы'],
  'гидростр': ['гидрострелка', 'гидрострелки', 'гидрострелкой'],
  'расшир':  ['расширительный', 'расширительного', 'расширительным'],
  'циркуля': ['циркуляция', 'циркуляции', 'циркуляцией', 'циркуляционный'],
  'обратн':  ['обратная', 'обратный', 'обратного', 'обратным'],
  'промыв':  ['промывка', 'промывки', 'промывкой', 'промывание'],
  'шумоиз':  ['шумоизоляция', 'шумоизоляции', 'шумоизоляцией'],
  'изоля':   ['изоляция', 'изоляции', 'изоляцией', 'теплоизоляция', 'теплоизоляции'],
  'инстал':  ['инсталляция', 'инсталляции', 'инсталляцией'],
};

/**
 * Normalize a Russian word by stripping common suffixes.
 * This is a simplified stemmer - not perfect, but handles the most common cases.
 */
function stemWord(word: string): string {
  let result = word.toLowerCase();
  
  // Try removing suffixes from longest to shortest
  for (const suffix of RU_SUFFIXES) {
    if (result.endsWith(suffix) && result.length - suffix.length >= 3) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  
  return result;
}

/**
 * Extract all numbers from a string.
 * E.g. "Труба Ø110" → [110], "Штроба Ø16-Ø32" → [16, 32]
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Generate character trigrams from a word for fuzzy matching.
 * E.g. "труба" → ["тру", "руб", "уба"]
 */
function getTrigrams(word: string): string[] {
  if (word.length < 3) return [word];
  const trigrams: string[] = [];
  for (let i = 0; i <= word.length - 3; i++) {
    trigrams.push(word.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Calculate trigram similarity between two strings (0 to 1).
 * Used for fuzzy matching when exact/stem matches fail.
 */
function trigramSimilarity(a: string, b: string): number {
  const triA = new Set(getTrigrams(a));
  const triB = new Set(getTrigrams(b));
  
  if (triA.size === 0 && triB.size === 0) return 0;
  
  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) intersection++;
  }
  
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Tokenize a search query into individual search tokens.
 * Handles:
 * - Splitting by whitespace
 * - Removing stop words (prepositions, conjunctions)
 * - Extracting numbers from mixed tokens (e.g. "Ø110" → number 110)
 * - Normalizing each word token via stemming
 * - Also keeping original word tokens for direct matching
 * 
 * Returns word stems, numbers, and raw tokens for matching.
 */
export function tokenizeQuery(query: string): {
  stems: string[];
  numbers: number[];
  rawTokens: string[];
} {
  const trimmed = query.toLowerCase().trim();
  if (!trimmed) return { stems: [], numbers: [], rawTokens: [] };

  const rawTokens = trimmed.split(/\s+/).filter(Boolean);
  const stems: string[] = [];
  const numbers: number[] = [];
  const seenStems = new Set<string>();

  for (const token of rawTokens) {
    // Skip stop words entirely — they cause false negatives
    if (STOP_WORDS.has(token)) continue;

    // Extract numbers from this token
    const nums = token.match(/\d+/g);
    if (nums) {
      numbers.push(...nums.map(Number));
    }

    // Get the word part (remove digits and special chars like Ø, °)
    const wordPart = token.replace(/[0-9øØ°№]/g, '').trim();
    if (wordPart.length >= 2) {
      const stem = stemWord(wordPart);
      if (!seenStems.has(stem)) {
        stems.push(stem);
        seenStems.add(stem);
      }
    }
  }

  return { stems, numbers, rawTokens };
}

/**
 * Check if a single stem matches any part of the text.
 * Uses multiple strategies:
 * 1. Direct substring match
 * 2. Stem-to-stem comparison (words in text are also stemmed)
 * 3. Synonym group lookup
 * 4. Trigram fuzzy matching (for typo tolerance)
 */
function stemMatchesText(stem: string, text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // First try: direct substring match (covers exact forms and most prefix matches)
  if (lowerText.includes(stem)) return true;
  
  // Second try: stem each word in the text and check
  const textWords = lowerText.split(/[\s\-/()Ø°.,;:]+/).filter(Boolean);
  for (const word of textWords) {
    const wordStem = stemWord(word);
    if (wordStem.startsWith(stem) || stem.startsWith(wordStem)) {
      return true;
    }
    // Trigram fuzzy match — for typo tolerance (e.g. "калонна" vs "колонна")
    if (stem.length >= 4 && wordStem.length >= 4) {
      const similarity = trigramSimilarity(stem, wordStem);
      if (similarity >= 0.6) return true;
    }
  }
  
  // Third try: check synonyms
  for (const [key, aliases] of Object.entries(SYNONYMS)) {
    const keyMatches = stem === key || stem.startsWith(key) || key.startsWith(stem);
    if (keyMatches) {
      // The search query matches this synonym group; check if text contains any form
      if (lowerText.includes(key)) return true;
      for (const alias of aliases) {
        if (lowerText.includes(alias)) return true;
      }
    }
    // Also check if the stem matches any alias's stem
    for (const alias of aliases) {
      const aliasStem = stemWord(alias);
      if (stem === aliasStem || stem.startsWith(aliasStem) || aliasStem.startsWith(stem)) {
        if (lowerText.includes(key)) return true;
        for (const a of aliases) {
          if (lowerText.includes(a)) return true;
        }
      }
    }
  }

  // Fourth try: fuzzy match against entire text words via trigrams
  if (stem.length >= 4) {
    for (const word of textWords) {
      if (word.length >= 4) {
        const similarity = trigramSimilarity(stem, word);
        if (similarity >= 0.55) return true;
      }
    }
  }

  return false;
}

/**
 * Check if a number appears in the text.
 * Extracts all numbers from text and compares.
 * Also checks if the number appears as a substring (e.g. 110 in "110-й").
 */
function numberMatchesText(num: number, text: string): boolean {
  const textNumbers = extractNumbers(text);
  if (textNumbers.includes(num)) return true;
  
  // Also check as substring in text (e.g. "110" in text that contains "110" as part of a range like "110-125")
  const numStr = String(num);
  if (text.toLowerCase().includes(numStr)) return true;
  
  return false;
}

/**
 * Calculate match score for a catalog item against tokenized query.
 * 
 * Returns 0 if no match, or a positive relevance score.
 * Higher scores = better matches.
 * 
 * Matching logic:
 * - Each stem is checked against name and description independently
 * - Numbers get high weight (they are very specific)
 * - Name matches are worth 2× description matches
 * - At least 1 stem/number must match to return a result
 * - OR logic with ranking: items matching MORE tokens rank higher
 * - Full match bonus: if ALL tokens match, score is boosted 1.5×
 */
export function matchItem(
  item: { n: string; d: string; catId?: string },
  tokens: { stems: string[]; numbers: number[]; rawTokens: string[] },
  categoryName?: string
): number {
  const { stems, numbers, rawTokens } = tokens;
  
  // Empty query matches everything with low relevance
  if (stems.length === 0 && numbers.length === 0) return 1;

  const nameLower = item.n.toLowerCase();
  const descLower = item.d.toLowerCase();
  // Also search in category name for cross-category queries
  const catLower = categoryName ? categoryName.toLowerCase() : '';
  
  let nameScore = 0;
  let descScore = 0;
  let nameMatches = 0;
  let descMatches = 0;

  // Check each stem against name, description, and category name
  for (const stem of stems) {
    if (stemMatchesText(stem, item.n)) {
      nameMatches++;
      // Bonus for exact raw token match in name
      for (const raw of rawTokens) {
        if (nameLower.includes(raw)) {
          nameScore += 2;
        }
      }
      nameScore += 3;
    } else if (stemMatchesText(stem, item.d)) {
      descMatches++;
      descScore += 1;
    } else if (catLower && stemMatchesText(stem, catLower)) {
      // Category name match — lower weight than description
      descMatches++;
      descScore += 0.5;
    }
  }

  // Check each number against name and description
  for (const num of numbers) {
    if (numberMatchesText(num, item.n)) {
      nameMatches++;
      nameScore += 4; // Numbers are very specific, high weight
    } else if (numberMatchesText(num, item.d)) {
      descMatches++;
      descScore += 2;
    }
  }

  // Require at least some matches
  const totalStemsAndNumbers = stems.length + numbers.length;
  const totalMatches = nameMatches + descMatches;
  
  if (totalMatches === 0) return 0;
  
  // OR logic with ranking: any match is valid, but more matches = higher score
  // Still require at least 30% of tokens to match (lenient)
  const matchRatio = totalMatches / totalStemsAndNumbers;
  
  if (matchRatio < 0.3) return 0; // Too few matches relative to query

  // Name matches are worth much more than description matches
  const baseScore = nameScore * 2 + descScore;
  
  // Bonus for matching ALL tokens
  if (matchRatio >= 1.0) {
    return baseScore * 1.5;
  }
  
  // Scale by match ratio for partial matches
  return baseScore * matchRatio;
}

/**
 * Escape special regex characters in a string for safe use in RegExp constructor.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get highlight tokens from a search query.
 * Returns an array of lowercase tokens to highlight in text.
 * Includes numbers for highlighting.
 */
export function getHighlightTokens(query: string): string[] {
  if (!query || query.length < 2) return [];
  
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length >= 1);
  const result: string[] = [];
  
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    result.push(token);
    // Also extract number parts for highlighting (e.g. "110" from "Ø110")
    const nums = token.match(/\d+/g);
    if (nums) {
      for (const num of nums) {
        if (num.length >= 2 && !result.includes(num)) {
          result.push(num);
        }
      }
    }
  }
  
  return result;
}

/**
 * Build a safe regex pattern from highlight tokens.
 */
export function buildHighlightPattern(tokens: string[]): string | null {
  if (tokens.length === 0) return null;
  const escapedTokens = tokens.map(t => escapeRegex(t));
  return escapedTokens.join('|');
}
