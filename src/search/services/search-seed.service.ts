import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DEFAULT_TERM_WEIGHT,
  SearchTerm,
  SearchTermDocument,
} from '../schemas/search-term.schema';
import {
  LOCATION_KIND_WEIGHT,
  LocationTerm,
  LocationTermDocument,
} from '../schemas/location-term.schema';
import { ALL_SEED_TERMS } from '../constants/lexicon.seed';
import { ALL_SEED_LOCATIONS } from '../constants/gazetteer.seed';
import { countTokens, normalizePhrase } from './text-normalizer';
import { LexiconService } from './lexicon.service';

export interface SeedReport {
  termsUpserted: number;
  termsRemoved: number;
  locationsUpserted: number;
  locationsRemoved: number;
  collisions: string[];
}

/**
 * Idempotent seeding of the hand-curated half of the lexicon.
 *
 * Safe to run repeatedly: it upserts `source: 'seed'` rows and deletes only the
 * seed rows that are no longer in the constants file. Inventory-materialized
 * rows are untouched.
 */
@Injectable()
export class SearchSeedService {
  private readonly logger = new Logger(SearchSeedService.name);

  constructor(
    @InjectModel(SearchTerm.name)
    private readonly searchTermModel: Model<SearchTermDocument>,
    @InjectModel(LocationTerm.name)
    private readonly locationTermModel: Model<LocationTermDocument>,
    private readonly lexicon: LexiconService,
  ) {}

  /**
   * What `seedAll()` would write, computed without touching the database.
   * Backs the dry-run mode of the seed script.
   */
  planSeed(): { termCount: number; locationCount: number; collisions: string[] } {
    const termPhrases = new Set<string>();
    for (const seed of ALL_SEED_TERMS) {
      for (const phrase of seed.terms) {
        const term = normalizePhrase(phrase);
        if (term) termPhrases.add(term);
      }
    }
    const locationPhrases = new Set<string>();
    for (const loc of ALL_SEED_LOCATIONS) {
      for (const alias of loc.aliases) {
        const term = normalizePhrase(alias);
        if (term) locationPhrases.add(term);
      }
    }
    return {
      termCount: termPhrases.size,
      locationCount: locationPhrases.size,
      collisions: [...termPhrases].filter((t) => locationPhrases.has(t)),
    };
  }

  async seedAll(): Promise<SeedReport> {
    const termPhrases = new Set<string>();
    const termOps: any[] = [];

    for (const seed of ALL_SEED_TERMS) {
      for (const phrase of seed.terms) {
        const term = normalizePhrase(phrase);
        if (!term) continue;
        termPhrases.add(term);
        termOps.push({
          updateOne: {
            filter: { term, type: seed.type, source: 'seed' },
            update: {
              $set: {
                term,
                tokenCount: countTokens(term),
                type: seed.type,
                payload: seed.payload,
                weight: seed.weight ?? DEFAULT_TERM_WEIGHT[seed.type],
                isActive: true,
                source: 'seed',
              },
            },
            upsert: true,
          },
        });
      }
    }

    const locationPhrases = new Set<string>();
    const locationOps: any[] = [];

    for (const loc of ALL_SEED_LOCATIONS) {
      for (const alias of loc.aliases) {
        const term = normalizePhrase(alias);
        if (!term) continue;
        locationPhrases.add(term);
        locationOps.push({
          updateOne: {
            filter: { term, kind: loc.kind, source: 'seed' },
            update: {
              $set: {
                term,
                tokenCount: countTokens(term),
                slug: loc.slug,
                kind: loc.kind,
                displayName: loc.displayName,
                district: loc.district,
                state: loc.state,
                country: 'india',
                centroid: loc.centroid,
                radiusKmHint: loc.radiusKmHint,
                weight: LOCATION_KIND_WEIGHT[loc.kind],
                isActive: true,
                source: 'seed',
              },
            },
            upsert: true,
          },
        });
      }
    }

    // A phrase that is both a product word and a place name makes every query
    // containing it ambiguous. Surface it loudly at seed time rather than
    // discovering it from a confused user.
    const collisions = [...termPhrases].filter((t) => locationPhrases.has(t));
    if (collisions.length > 0) {
      this.logger.warn(
        `Lexicon/gazetteer collisions (resolved by locative position at parse time): ${collisions.join(', ')}`,
      );
    }

    for (let i = 0; i < termOps.length; i += 500) {
      await this.searchTermModel.bulkWrite(termOps.slice(i, i + 500), { ordered: false });
    }
    for (let i = 0; i < locationOps.length; i += 500) {
      await this.locationTermModel.bulkWrite(locationOps.slice(i, i + 500), { ordered: false });
    }

    const termsRemoved = await this.searchTermModel.deleteMany({
      source: 'seed',
      term: { $nin: [...termPhrases] },
    });
    const locationsRemoved = await this.locationTermModel.deleteMany({
      source: 'seed',
      term: { $nin: [...locationPhrases] },
    });

    await this.lexicon.reload();

    const report: SeedReport = {
      termsUpserted: termOps.length,
      termsRemoved: termsRemoved.deletedCount ?? 0,
      locationsUpserted: locationOps.length,
      locationsRemoved: locationsRemoved.deletedCount ?? 0,
      collisions,
    };
    this.logger.log(`Search seed complete: ${JSON.stringify(report)}`);
    return report;
  }

  /**
   * Bootstrap extra gazetteer rows from the location hierarchy already written
   * onto live ads by reverse geocoding. Anything not already covered by the
   * curated seed is inserted as `source: 'derived'` with a low weight, so a
   * curated entry always wins. Review these before promoting them.
   */
  async deriveLocationsFromAds(adModel: Model<any>): Promise<number> {
    const [cities, districts] = await Promise.all([
      adModel.distinct('city', { isDeleted: { $ne: true }, city: { $nin: [null, ''] } }),
      adModel.distinct('district', { isDeleted: { $ne: true }, district: { $nin: [null, ''] } }),
    ]);

    const existing = new Set(
      (await this.locationTermModel.distinct('term')).map((t: string) => t),
    );

    const ops: any[] = [];
    const add = (name: string, kind: 'city' | 'district') => {
      const term = normalizePhrase(name);
      if (!term || existing.has(term)) return;
      ops.push({
        updateOne: {
          filter: { term, kind, source: 'derived' },
          update: {
            $set: {
              term,
              tokenCount: countTokens(term),
              slug: term.replace(/\s+/g, '-'),
              kind,
              displayName: name,
              country: 'india',
              weight: kind === 'city' ? 40 : 35, // below every curated entry
              isActive: true,
              source: 'derived',
            },
          },
          upsert: true,
        },
      });
    };

    for (const c of cities as string[]) add(c, 'city');
    for (const d of districts as string[]) add(d, 'district');

    for (let i = 0; i < ops.length; i += 500) {
      await this.locationTermModel.bulkWrite(ops.slice(i, i + 500), { ordered: false });
    }
    if (ops.length > 0) await this.lexicon.reload();

    this.logger.log(`Derived ${ops.length} gazetteer rows from live ad locations`);
    return ops.length;
  }
}
