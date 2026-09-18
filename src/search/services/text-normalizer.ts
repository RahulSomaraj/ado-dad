/**
 * Query/term normalization shared by the seeder, the lexicon and the parser.
 *
 * The one hard requirement: normalization must be **token-local**. A token is
 * never split or merged, so every normalized token keeps the exact character
 * span it occupied in the raw query — that is what lets the API return
 * `sourceSpan` for each chip and lets the app strike out the matched words.
 */

/**
 * Matches a word, a number, or an Indian-formatted number (5,00,000 / 1.5),
 * plus a bare rupee sign. Punctuation between tokens is skipped naturally, so
 * "2bhk, kollam!" tokenizes to ["2bhk", "kollam"] with correct offsets.
 *
 * \p{M} is essential, not decoration: Malayalam vowel signs and the virama are
 * combining MARKS, not letters, so a letters-only class shatters "കാർ" into
 * three tokens and no transliteration can ever match.
 */
const TOKEN_RE =
  /\d+(?:[.,]\d+)*[\p{L}\p{M}]*|[\p{L}\p{M}][\p{L}\p{N}\p{M}]*|₹/gu;

/**
 * Malayalam → romanized forms for the seeded vocabulary only. This is
 * deliberately small: it covers the words people actually type in script, not
 * the language. Anything unmapped falls through to free text unharmed.
 */
export const MALAYALAM_TRANSLITERATIONS: Readonly<Record<string, string>> = {
  കാർ: 'car',
  കാര്: 'car',
  വണ്ടി: 'vehicle',
  ബൈക്ക്: 'bike',
  ബൈക്: 'bike',
  സ്കൂട്ടർ: 'scooter',
  ലോറി: 'lorry',
  ബസ്: 'bus',
  വീട്: 'house',
  വീട്ട്: 'house',
  ഫ്ലാറ്റ്: 'flat',
  സ്ഥലം: 'land',
  പുരയിടം: 'land',
  കട: 'shop',
  വാടക: 'rent',
  വിൽപ്പന: 'sale',
  വില്പന: 'sale',
  വില: 'price',
  കൊല്ലം: 'kollam',
  തിരുവനന്തപുരം: 'thiruvananthapuram',
  കൊച്ചി: 'kochi',
  എറണാകുളം: 'ernakulam',
  തൃശൂർ: 'thrissur',
  കോഴിക്കോട്: 'kozhikode',
  ആലപ്പുഴ: 'alappuzha',
  കണ്ണൂർ: 'kannur',
  പാലക്കാട്: 'palakkad',
  മലപ്പുറം: 'malappuram',
  കോട്ടയം: 'kottayam',
  പത്തനംതിട്ട: 'pathanamthitta',
  ഇടുക്കി: 'idukki',
  വയനാട്: 'wayanad',
  കാസർഗോഡ്: 'kasaragod',
};

/**
 * Words that carry no retrieval signal. They are skipped when counting how much
 * of the query the parser understood, so "cars in kollam" scores 2/2, not 2/3.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'to', 'for', 'with', 'my', 'me', 'i',
  'is', 'are', 'was', 'want', 'wanted', 'need', 'needed', 'looking', 'look',
  'buy', 'get', 'any', 'some', 'good', 'best', 'please', 'pls', 'available',
  'sale',
]);

/** Prepositions that mark everything after them as a place. */
export const LOCATIVE_SEPARATORS: readonly string[] = [
  'in', 'at', 'near', 'nearby', 'around', 'within', 'from',
];

/**
 * Everything the parser should neither match on its own, keep as free text, nor
 * count towards confidence. Locative prepositions belong here: they are grammar
 * that the parser consumes structurally, so leaving "in" in `freeText` would put
 * a meaningless token into the `$text` query and drag confidence down.
 */
export const IGNORED_TOKENS: ReadonlySet<string> = new Set([
  ...STOP_WORDS,
  ...LOCATIVE_SEPARATORS,
]);

export interface RawToken {
  /** Normalized text: lowercase, transliterated, thousands separators removed. */
  text: string;
  /** Character offset of the token in the ORIGINAL query string. */
  start: number;
  /** Exclusive end offset in the original query string. */
  end: number;
  /** The untouched original slice, for display. */
  raw: string;
}

/** Normalize a single token. Must never return a string containing whitespace. */
export function normalizeToken(raw: string): string {
  let t = raw.normalize('NFKC').toLowerCase();
  if (MALAYALAM_TRANSLITERATIONS[raw]) return MALAYALAM_TRANSLITERATIONS[raw];
  if (MALAYALAM_TRANSLITERATIONS[t]) return MALAYALAM_TRANSLITERATIONS[t];
  // Indian digit grouping: 5,00,000 -> 500000. Only when every separator sits
  // between digits, so "civic,vti" is not mangled into one word.
  if (/^\d[\d,]*\d$/.test(t)) t = t.replace(/,/g, '');
  return t;
}

/** Tokenize the ORIGINAL query, preserving offsets. */
export function tokenize(query: string): RawToken[] {
  const tokens: RawToken[] = [];
  if (!query) return tokens;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(query)) !== null) {
    const raw = m[0];
    const text = normalizeToken(raw);
    if (!text) continue;
    tokens.push({ text, start: m.index, end: m.index + raw.length, raw });
  }
  return tokens;
}

/**
 * Normalize a phrase for storage in the lexicon (no offsets needed). Used by the
 * seeder and the materializer so a stored `term` is guaranteed to be comparable
 * to what `tokenize()` produces at query time.
 */
export function normalizePhrase(phrase: string): string {
  return tokenize(phrase)
    .map((t) => t.text)
    .join(' ');
}

/** Token count of an already-normalized phrase. */
export function countTokens(normalized: string): number {
  return normalized ? normalized.split(' ').length : 0;
}

/** URL/index-safe slug: "Maruti Suzuki" -> "maruti-suzuki". */
export function slugify(value: string): string {
  return normalizePhrase(value).replace(/\s+/g, '-');
}
