import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SearchTerm,
  SearchTermDocument,
  SearchTermPayload,
  SearchTermType,
} from '../schemas/search-term.schema';
import {
  LocationKind,
  LocationTerm,
  LocationTermDocument,
} from '../schemas/location-term.schema';
import { FuzzyHit, FuzzyLexicon } from './fuzzy-lexicon';

export interface LexiconEntry {
  term: string;
  tokenCount: number;
  type: SearchTermType;
  payload: SearchTermPayload;
  weight: number;
}

export interface GazetteerEntry {
  term: string;
  tokenCount: number;
  slug: string;
  kind: LocationKind;
  displayName: string;
  district?: string;
  state?: string;
  country?: string;
  centroid?: [number, number];
  radiusKmHint?: number;
  weight: number;
}

/**
 * 'full' when the catalogue has been materialised into `search_terms`;
 * 'hint-only' when only seed rows exist. In hint-only mode the parser can still
 * pick categories from seed words but never produces brand/model filters, and
 * every list request logs the degradation once a minute.
 */
export type LexiconMode = 'full' | 'hint-only' | 'empty';

export interface LexiconHealth {
  mode: LexiconMode;
  termPhrases: number;
  locationPhrases: number;
  byType: Partial<Record<SearchTermType, number>>;
  fuzzyVocabulary: number;
  maxNgram: number;
  loadedAt: string | null;
  ageMs: number | null;
  /** Newest `updatedAt` among `source: 'inventory'` rows — when the catalogue was last copied in. */
  lastMaterializedAt: string | null;
}

/**
 * Holds the whole lexicon in process memory.
 *
 * Sizing: ~400 seed phrases + ~3–6k materialized brand/model/variant phrases +
 * ~120 gazetteer spellings. Low tens of thousands of small objects at the
 * absolute ceiling — a few MB, and it removes a database round trip from the
 * hot path of every search. Refreshed on a timer and on demand; a stale entry
 * for a few minutes is harmless because the worst case is that a brand added
 * moments ago is treated as free text until the next refresh.
 *
 * The fuzzy indexes (one over term tokens, one over place tokens) are rebuilt
 * on every reload from the same rows, so spelling correction can never point at
 * a phrase that is not in the lexicon.
 *
 * NOT backed by Redis on purpose: this is a read-mostly derived index, and every
 * instance rebuilding it independently is simpler than keeping a shared copy
 * coherent. Redis is used only to broadcast an invalidation in S5.
 */
@Injectable()
export class LexiconService implements OnModuleInit {
  private readonly logger = new Logger(LexiconService.name);

  /** key: `${tokenCount}:${term}` -> every entry claiming that phrase. */
  private terms = new Map<string, LexiconEntry[]>();
  private locations = new Map<string, GazetteerEntry[]>();

  /** Sorted phrase lists, for the prefix suggestions added in S5. */
  private sortedTermPhrases: string[] = [];
  private sortedLocationPhrases: string[] = [];

  private readonly termFuzzy = new FuzzyLexicon();
  private readonly locationFuzzy = new FuzzyLexicon();

  private maxTermTokens = 1;
  private maxLocationTokens = 1;
  private loadedAt = 0;
  private byType: Partial<Record<SearchTermType, number>> = {};
  private lastMaterializedAt: Date | null = null;
  private lastModeWarningAt = 0;

  /** How long a loaded lexicon is considered fresh. */
  private static readonly TTL_MS = 15 * 60 * 1000;

  constructor(
    @InjectModel(SearchTerm.name)
    private readonly searchTermModel: Model<SearchTermDocument>,
    @InjectModel(LocationTerm.name)
    private readonly locationTermModel: Model<LocationTermDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Never block boot on the lexicon: an empty lexicon degrades search to
    // today's free-text behaviour, which is survivable; a failed boot is not.
    try {
      await this.reload();
    } catch (err) {
      this.logger.error(
        `Lexicon load failed at boot, search will run unparsed until the next refresh: ${
          (err as Error).message
        }`,
      );
    }
  }

  /** Largest n the n-gram scan needs to try. */
  get maxNgram(): number {
    return Math.max(this.maxTermTokens, this.maxLocationTokens);
  }

  get isEmpty(): boolean {
    return this.terms.size === 0 && this.locations.size === 0;
  }

  get mode(): LexiconMode {
    if (this.isEmpty) return 'empty';
    const models = this.byType[SearchTermType.MODEL] ?? 0;
    const brands = this.byType[SearchTermType.MANUFACTURER] ?? 0;
    return models > 0 || brands > 0 ? 'full' : 'hint-only';
  }

  async ensureFresh(): Promise<void> {
    if (Date.now() - this.loadedAt < LexiconService.TTL_MS) {
      this.warnIfDegraded();
      return;
    }
    try {
      await this.reload();
    } catch (err) {
      // Keep serving the stale copy rather than failing the search.
      this.logger.warn(`Lexicon refresh failed, serving stale copy: ${(err as Error).message}`);
      this.loadedAt = Date.now();
    }
    this.warnIfDegraded();
  }

  /** Once a minute, not once a request: the catalogue is missing from the lexicon. */
  private warnIfDegraded(): void {
    if (this.mode === 'full') return;
    const now = Date.now();
    if (now - this.lastModeWarningAt < 60_000) return;
    this.lastModeWarningAt = now;
    this.logger.error(
      `Lexicon is in '${this.mode}' mode — no brand/model terms loaded. Search runs on text only. ` +
        'Run: npm run search:seed (then npm run search:validate).',
    );
  }

  async reload(): Promise<{ terms: number; locations: number }> {
    const [termDocs, locationDocs, newestInventory] = await Promise.all([
      this.searchTermModel
        .find({ isActive: true })
        .select('term tokenCount type payload weight')
        .lean()
        .exec(),
      this.locationTermModel
        .find({ isActive: true })
        .select('term tokenCount slug kind displayName district state country centroid radiusKmHint weight')
        .lean()
        .exec(),
      this.searchTermModel
        .findOne({ source: 'inventory' })
        .sort({ updatedAt: -1 })
        .select('updatedAt')
        .lean()
        .exec()
        .catch(() => null),
    ]);

    const terms = new Map<string, LexiconEntry[]>();
    const byType: Partial<Record<SearchTermType, number>> = {};
    const termTokens = new Set<string>();
    let maxTermTokens = 1;
    for (const d of termDocs as any[]) {
      const key = `${d.tokenCount}:${d.term}`;
      const entry: LexiconEntry = {
        term: d.term,
        tokenCount: d.tokenCount,
        type: d.type,
        payload: d.payload ?? {},
        weight: d.weight ?? 50,
      };
      const bucket = terms.get(key);
      if (bucket) bucket.push(entry);
      else terms.set(key, [entry]);
      if (d.tokenCount > maxTermTokens) maxTermTokens = d.tokenCount;
      byType[d.type as SearchTermType] = (byType[d.type as SearchTermType] ?? 0) + 1;
      for (const tok of String(d.term).split(' ')) termTokens.add(tok);
    }

    const locations = new Map<string, GazetteerEntry[]>();
    const locationTokens = new Set<string>();
    let maxLocationTokens = 1;
    for (const d of locationDocs as any[]) {
      const key = `${d.tokenCount}:${d.term}`;
      const entry: GazetteerEntry = {
        term: d.term,
        tokenCount: d.tokenCount,
        slug: d.slug,
        kind: d.kind,
        displayName: d.displayName,
        district: d.district,
        state: d.state,
        country: d.country,
        centroid: d.centroid,
        radiusKmHint: d.radiusKmHint,
        weight: d.weight ?? 60,
      };
      const bucket = locations.get(key);
      if (bucket) bucket.push(entry);
      else locations.set(key, [entry]);
      if (d.tokenCount > maxLocationTokens) maxLocationTokens = d.tokenCount;
      for (const tok of String(d.term).split(' ')) locationTokens.add(tok);
    }

    // Highest weight first so callers can take [0] as the winner.
    for (const bucket of terms.values()) bucket.sort((a, b) => b.weight - a.weight);
    for (const bucket of locations.values()) bucket.sort((a, b) => b.weight - a.weight);

    this.termFuzzy.build(termTokens);
    this.locationFuzzy.build(locationTokens);

    this.terms = terms;
    this.locations = locations;
    this.byType = byType;
    this.maxTermTokens = maxTermTokens;
    this.maxLocationTokens = maxLocationTokens;
    this.sortedTermPhrases = [...new Set((termDocs as any[]).map((d) => d.term))].sort();
    this.sortedLocationPhrases = [
      ...new Set((locationDocs as any[]).map((d) => d.term)),
    ].sort();
    this.lastMaterializedAt = (newestInventory as any)?.updatedAt ?? null;
    this.loadedAt = Date.now();

    this.logger.log(
      `Lexicon loaded: ${termDocs.length} terms (max ${maxTermTokens}-gram), ` +
        `${locationDocs.length} locations (max ${maxLocationTokens}-gram), ` +
        `fuzzy vocabulary ${this.termFuzzy.size + this.locationFuzzy.size}, mode=${this.mode}`,
    );
    return { terms: termDocs.length, locations: locationDocs.length };
  }

  /** Every lexicon entry claiming this exact normalized phrase. */
  lookupTerm(phrase: string, tokenCount: number): LexiconEntry[] {
    return this.terms.get(`${tokenCount}:${phrase}`) ?? [];
  }

  /** Every gazetteer entry claiming this exact normalized phrase. */
  lookupLocation(phrase: string, tokenCount: number): GazetteerEntry[] {
    return this.locations.get(`${tokenCount}:${phrase}`) ?? [];
  }

  /** True when the token appears in any lexicon or gazetteer phrase. */
  hasToken(token: string): boolean {
    return this.termFuzzy.has(token) || this.locationFuzzy.has(token);
  }

  /**
   * Unique spelling correction for a token, against term tokens first (place
   * tokens first when `preferLocation`). Null on a miss or a tie.
   */
  correctToken(token: string, preferLocation = false): FuzzyHit | null {
    const first = preferLocation ? this.locationFuzzy : this.termFuzzy;
    const second = preferLocation ? this.termFuzzy : this.locationFuzzy;
    return first.correct(token) ?? second.correct(token);
  }

  /** Prefix match over stored phrases. Used by the suggest endpoint (S5). */
  prefixMatch(prefix: string, limit = 10): { terms: string[]; locations: string[] } {
    const take = (list: string[]) => {
      const out: string[] = [];
      for (const phrase of list) {
        if (phrase.startsWith(prefix)) {
          out.push(phrase);
          if (out.length >= limit) break;
        } else if (out.length > 0) {
          break; // sorted: once we pass the prefix range we are done
        }
      }
      return out;
    };
    return {
      terms: take(this.sortedTermPhrases),
      locations: take(this.sortedLocationPhrases),
    };
  }

  /** Diagnostics for search:validate and the debug response. */
  health(): LexiconHealth {
    return {
      mode: this.mode,
      termPhrases: this.terms.size,
      locationPhrases: this.locations.size,
      byType: { ...this.byType },
      fuzzyVocabulary: this.termFuzzy.size + this.locationFuzzy.size,
      maxNgram: this.maxNgram,
      loadedAt: this.loadedAt ? new Date(this.loadedAt).toISOString() : null,
      ageMs: this.loadedAt ? Date.now() - this.loadedAt : null,
      lastMaterializedAt: this.lastMaterializedAt
        ? new Date(this.lastMaterializedAt).toISOString()
        : null,
    };
  }

  /** @deprecated use health() */
  stats() {
    const h = this.health();
    return {
      termPhrases: h.termPhrases,
      locationPhrases: h.locationPhrases,
      maxNgram: h.maxNgram,
      loadedAt: h.loadedAt,
      ageMs: h.ageMs,
    };
  }
}
