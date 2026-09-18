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
 * Holds the whole lexicon in process memory.
 *
 * Sizing: ~400 seed phrases + ~3–6k materialized brand/model/variant phrases +
 * ~120 gazetteer spellings. Low tens of thousands of small objects at the
 * absolute ceiling — a few MB, and it removes a database round trip from the
 * hot path of every search. Refreshed on a timer and on demand; a stale entry
 * for a few minutes is harmless because the worst case is that a brand added
 * moments ago is treated as free text until the next refresh.
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

  private maxTermTokens = 1;
  private maxLocationTokens = 1;
  private loadedAt = 0;

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

  async ensureFresh(): Promise<void> {
    if (Date.now() - this.loadedAt < LexiconService.TTL_MS) return;
    try {
      await this.reload();
    } catch (err) {
      // Keep serving the stale copy rather than failing the search.
      this.logger.warn(`Lexicon refresh failed, serving stale copy: ${(err as Error).message}`);
      this.loadedAt = Date.now();
    }
  }

  async reload(): Promise<{ terms: number; locations: number }> {
    const [termDocs, locationDocs] = await Promise.all([
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
    ]);

    const terms = new Map<string, LexiconEntry[]>();
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
    }

    const locations = new Map<string, GazetteerEntry[]>();
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
    }

    // Highest weight first so callers can take [0] as the winner.
    for (const bucket of terms.values()) bucket.sort((a, b) => b.weight - a.weight);
    for (const bucket of locations.values()) bucket.sort((a, b) => b.weight - a.weight);

    this.terms = terms;
    this.locations = locations;
    this.maxTermTokens = maxTermTokens;
    this.maxLocationTokens = maxLocationTokens;
    this.sortedTermPhrases = [...new Set((termDocs as any[]).map((d) => d.term))].sort();
    this.sortedLocationPhrases = [
      ...new Set((locationDocs as any[]).map((d) => d.term)),
    ].sort();
    this.loadedAt = Date.now();

    this.logger.log(
      `Lexicon loaded: ${termDocs.length} terms (max ${maxTermTokens}-gram), ` +
        `${locationDocs.length} locations (max ${maxLocationTokens}-gram)`,
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

  /** Diagnostics for the admin/health endpoint. */
  stats() {
    return {
      termPhrases: this.terms.size,
      locationPhrases: this.locations.size,
      maxNgram: this.maxNgram,
      loadedAt: this.loadedAt ? new Date(this.loadedAt).toISOString() : null,
      ageMs: this.loadedAt ? Date.now() - this.loadedAt : null,
    };
  }
}
