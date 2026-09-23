/**
 * Typo tolerance for the lexicon, independent of the search engine.
 *
 * Two layers, both over the vocabulary of single tokens that appear in lexicon
 * and gazetteer phrases (a few thousand words, well under a megabyte):
 *
 *  1. SymSpell — every vocabulary word is indexed by all of its deletions up to
 *     two characters. A query token is corrected by generating ITS deletions and
 *     intersecting, then ranking the candidates by optimal-string-alignment
 *     distance (Damerau–Levenshtein with adjacent transpositions, so "swfit" is
 *     one edit from "swift"). Lookups are O(deletions), not O(vocabulary).
 *  2. Phonetic — a small Indic-Latin key (first letter kept, vowels dropped,
 *     v/w and ph/f folded, doubled letters collapsed) catches spellings that are
 *     more than two edits away but sound the same: "vagonar" → "wagonr",
 *     "enfeild" → "enfield".
 *
 * Safety rails, because a wrong correction is worse than no correction:
 *  - tokens shorter than MIN_FUZZY_LENGTH are never corrected (too many
 *    collisions: "cart"/"car", "kia"/"kit");
 *  - the allowed distance scales with length (5–7 chars: 1 edit, 8+: 2);
 *  - a tie between two different words at the best distance is NOT applied —
 *    the caller leaves the token alone and lets the text engine's own fuzzy
 *    matching (Atlas Search) take it from there;
 *  - numbers and stop words are the caller's responsibility to skip.
 *
 * The class is pure and synchronous so it can be unit-tested and rebuilt on
 * every lexicon reload without touching the database.
 */

export interface FuzzyHit {
  /** The vocabulary word the token was corrected to. */
  to: string;
  /** Edit distance between the token and `to` (phonetic hits report the real distance too). */
  distance: number;
  via: 'edit' | 'phonetic';
}

/** Tokens shorter than this are never fuzzy-matched. */
export const MIN_FUZZY_LENGTH = 5;

/** Deletion depth indexed per vocabulary word. */
const INDEX_MAX_EDITS = 2;

/** Phonetic hits must still be within this many edits, or they are ignored. */
const PHONETIC_MAX_DISTANCE = 3;

/** Allowed edits for a query token of this length. */
export function maxEditsFor(length: number): number {
  if (length < MIN_FUZZY_LENGTH) return 0;
  if (length <= 7) return 1;
  return 2;
}

/**
 * Optimal string alignment distance (Damerau–Levenshtein restricted to adjacent
 * transpositions). `cap` short-circuits rows that already exceed the budget.
 */
export function editDistance(a: string, b: string, cap = INDEX_MAX_EDITS + 1): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev2: number[] = [];
  let prev: number[] = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    const cur: number[] = new Array(lb + 1);
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return cap + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[lb];
}

/**
 * Indic-Latin phonetic key. Deliberately crude: it only has to make two
 * spellings of the same brand collide, not classify English.
 */
export function phoneticKey(token: string): string {
  let t = token.toLowerCase();
  if (!t) return '';
  t = t
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/v/g, 'w');
  const first = t[0];
  const rest = t.slice(1).replace(/[aeiouyh]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1');
}

/** All strings reachable from `word` by deleting up to `maxEdits` characters. */
function deletions(word: string, maxEdits: number): Set<string> {
  const out = new Set<string>();
  const walk = (w: string, depth: number) => {
    if (depth === maxEdits) return;
    for (let i = 0; i < w.length; i++) {
      const d = w.slice(0, i) + w.slice(i + 1);
      if (!out.has(d)) {
        out.add(d);
        walk(d, depth + 1);
      }
    }
  };
  walk(word, 0);
  return out;
}

export class FuzzyLexicon {
  private vocab = new Set<string>();
  /** deletion → vocabulary words that produce it. Words map to themselves too. */
  private deletes = new Map<string, string[]>();
  private phonetic = new Map<string, string[]>();

  /** Replace the index with a new vocabulary. Words shorter than 3 chars are ignored. */
  build(words: Iterable<string>): void {
    const vocab = new Set<string>();
    const deletes = new Map<string, string[]>();
    const phonetic = new Map<string, string[]>();

    const add = (map: Map<string, string[]>, key: string, word: string) => {
      const bucket = map.get(key);
      if (bucket) {
        if (!bucket.includes(word)) bucket.push(word);
      } else {
        map.set(key, [word]);
      }
    };

    for (const raw of words) {
      const w = (raw ?? '').trim();
      if (w.length < 3 || vocab.has(w)) continue;
      vocab.add(w);
      add(deletes, w, w);
      if (w.length >= MIN_FUZZY_LENGTH) {
        for (const d of deletions(w, INDEX_MAX_EDITS)) add(deletes, d, w);
        add(phonetic, phoneticKey(w), w);
      }
    }

    this.vocab = vocab;
    this.deletes = deletes;
    this.phonetic = phonetic;
  }

  get size(): number {
    return this.vocab.size;
  }

  has(word: string): boolean {
    return this.vocab.has(word);
  }

  /**
   * Best unique correction for `token`, or null when there is none, when the
   * token is too short, or when two different words tie for the best distance.
   * A token already in the vocabulary returns null: it needs no correction.
   */
  correct(token: string): FuzzyHit | null {
    if (!token || token.length < MIN_FUZZY_LENGTH) return null;
    if (this.vocab.has(token)) return null;
    if (!/\p{L}/u.test(token)) return null; // never correct pure numbers

    const budget = maxEditsFor(token.length);
    if (budget > 0) {
      const candidates = new Set<string>();
      for (const w of this.deletes.get(token) ?? []) candidates.add(w);
      for (const d of deletions(token, budget)) {
        for (const w of this.deletes.get(d) ?? []) candidates.add(w);
      }

      let best: string | null = null;
      let bestDistance = budget + 1;
      let tie = false;
      for (const w of candidates) {
        const dist = editDistance(token, w, budget);
        if (dist > budget) continue;
        if (dist < bestDistance) {
          best = w;
          bestDistance = dist;
          tie = false;
        } else if (dist === bestDistance && w !== best) {
          tie = true;
        }
      }
      if (best && !tie) return { to: best, distance: bestDistance, via: 'edit' };
      if (best && tie) return null; // ambiguous at the best distance — leave it alone
    }

    // Phonetic fallback: same key, still close, and unique.
    const bucket = this.phonetic.get(phoneticKey(token)) ?? [];
    let best: string | null = null;
    let bestDistance = PHONETIC_MAX_DISTANCE + 1;
    let tie = false;
    for (const w of bucket) {
      if (Math.abs(w.length - token.length) > 2) continue;
      const dist = editDistance(token, w, PHONETIC_MAX_DISTANCE);
      if (dist > PHONETIC_MAX_DISTANCE) continue;
      if (dist < bestDistance) {
        best = w;
        bestDistance = dist;
        tie = false;
      } else if (dist === bestDistance && w !== best) {
        tie = true;
      }
    }
    if (best && !tie) return { to: best, distance: bestDistance, via: 'phonetic' };
    return null;
  }
}
