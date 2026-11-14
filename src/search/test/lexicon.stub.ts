import {
  GazetteerEntry,
  LexiconEntry,
  LexiconHealth,
  LexiconMode,
  LexiconService,
} from '../services/lexicon.service';
import { FuzzyHit, FuzzyLexicon } from '../services/fuzzy-lexicon';
import {
  DEFAULT_TERM_WEIGHT,
  SearchTermPayload,
  SearchTermType,
} from '../schemas/search-term.schema';
import { LOCATION_KIND_WEIGHT, LocationKind } from '../schemas/location-term.schema';
import { ALL_SEED_TERMS } from '../constants/lexicon.seed';
import { ALL_SEED_LOCATIONS } from '../constants/gazetteer.seed';
import { countTokens, normalizePhrase } from '../services/text-normalizer';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';

/** Fixture ids, exported so planner/adapter tests can assert on them. */
export const FIXTURE_IDS = {
  MARUTI: '65b000000000000000000001',
  HONDA_CARS: '65b000000000000000000002',
  ENFIELD: '65b000000000000000000003',
  HYUNDAI: '65b000000000000000000004',
  HONDA_BIKES: '65b000000000000000000005',
  TATA: '65b000000000000000000006',
  VOLKSWAGEN: '65b000000000000000000007',
  SWIFT_DZIRE: '65b000000000000000000011',
  ACTIVA: '65b000000000000000000012',
  BULLET: '65b000000000000000000013',
  CRETA: '65b000000000000000000014',
  SWIFT: '65b000000000000000000015',
  I20: '65b000000000000000000016',
  VERNA: '65b000000000000000000017',
  NEXON: '65b000000000000000000018',
  ACE: '65b000000000000000000019',
  VENTO: '65b00000000000000000001a',
  VENUE: '65b00000000000000000001b',
  DZIRE_VDI: '65b000000000000000000021',
  CRETA_SX: '65b000000000000000000022',
  DIESEL: '65b000000000000000000031',
  PETROL: '65b000000000000000000032',
  AUTOMATIC: '65b000000000000000000041',
  MANUAL: '65b000000000000000000042',
} as const;

/**
 * A stand-in for a loaded LexiconService built from the real seed constants
 * plus a small fixture catalogue, so the parser is exercised against the data
 * that will actually ship rather than a hand-made mock.
 *
 * `makeLexicon({ inventory: false })` gives the "seed only, catalogue never
 * materialised" state (L0) that every hint-only test needs.
 */
export class LexiconStub {
  private terms = new Map<string, LexiconEntry[]>();
  private locations = new Map<string, GazetteerEntry[]>();
  private _maxNgram = 1;
  private readonly termFuzzy = new FuzzyLexicon();
  private readonly locationFuzzy = new FuzzyLexicon();
  private termTokens = new Set<string>();
  private locationTokens = new Set<string>();
  private byType: Partial<Record<SearchTermType, number>> = {};

  constructor(opts: { inventory?: boolean } = {}) {
    for (const seed of ALL_SEED_TERMS) {
      for (const phrase of seed.terms) {
        this.addTerm(phrase, seed.type, seed.payload as SearchTermPayload, seed.weight);
      }
    }
    for (const loc of ALL_SEED_LOCATIONS) {
      for (const alias of loc.aliases) {
        this.addLocation(alias, {
          slug: loc.slug,
          kind: loc.kind,
          displayName: loc.displayName,
          district: loc.district,
          state: loc.state,
          centroid: loc.centroid,
          radiusKmHint: loc.radiusKmHint,
        });
      }
    }
    if (opts.inventory !== false) this.addFixtureInventory();
    this.rebuildFuzzy();
  }

  addTerm(
    phrase: string,
    type: SearchTermType,
    payload: SearchTermPayload,
    weight?: number,
  ): void {
    const term = normalizePhrase(phrase);
    if (!term) return;
    const tokenCount = countTokens(term);
    const entry: LexiconEntry = {
      term,
      tokenCount,
      type,
      payload,
      weight: weight ?? DEFAULT_TERM_WEIGHT[type],
    };
    const key = `${tokenCount}:${term}`;
    const bucket = this.terms.get(key);
    if (bucket) {
      bucket.push(entry);
      bucket.sort((a, b) => b.weight - a.weight);
    } else {
      this.terms.set(key, [entry]);
    }
    if (tokenCount > this._maxNgram) this._maxNgram = tokenCount;
    this.byType[type] = (this.byType[type] ?? 0) + 1;
    for (const tok of term.split(' ')) this.termTokens.add(tok);
  }

  addLocation(
    phrase: string,
    data: Omit<GazetteerEntry, 'term' | 'tokenCount' | 'weight'> & { weight?: number },
  ): void {
    const term = normalizePhrase(phrase);
    if (!term) return;
    const tokenCount = countTokens(term);
    const entry: GazetteerEntry = {
      ...data,
      term,
      tokenCount,
      weight: data.weight ?? LOCATION_KIND_WEIGHT[data.kind],
    };
    const key = `${tokenCount}:${term}`;
    const bucket = this.locations.get(key);
    if (bucket) {
      bucket.push(entry);
      bucket.sort((a, b) => b.weight - a.weight);
    } else {
      this.locations.set(key, [entry]);
    }
    if (tokenCount > this._maxNgram) this._maxNgram = tokenCount;
    for (const tok of term.split(' ')) this.locationTokens.add(tok);
  }

  /** Call after adding terms outside the constructor. */
  rebuildFuzzy(): void {
    this.termFuzzy.build(this.termTokens);
    this.locationFuzzy.build(this.locationTokens);
  }

  /** Stand-in for what InventoryLexiconMaterializer would produce. */
  private addFixtureInventory(): void {
    const F = FIXTURE_IDS;
    const CARS = AdCategoryV2.PRIVATE_VEHICLE;
    const BIKES = AdCategoryV2.TWO_WHEELER;
    const CV = AdCategoryV2.COMMERCIAL_VEHICLE;

    const brand = (
      names: string[],
      ids: string | string[],
      name: string,
      categories?: AdCategoryV2[],
    ) => {
      const list = Array.isArray(ids) ? ids : [ids];
      for (const n of names) {
        this.addTerm(n, SearchTermType.MANUFACTURER, {
          manufacturerId: list[0],
          ...(list.length > 1 ? { manufacturerIds: list } : {}),
          manufacturerName: name,
          label: name,
          ...(categories ? { categories } : {}),
        });
      }
    };
    brand(['maruti suzuki', 'maruti', 'suzuki'], F.MARUTI, 'Maruti Suzuki', [CARS]);
    // Honda is two manufacturer documents (cars, bikes); the materializer merges
    // them into one term carrying both ids and both categories.
    brand(['honda'], [F.HONDA_CARS, F.HONDA_BIKES], 'Honda', [CARS, BIKES]);
    brand(['royal enfield', 'enfield'], F.ENFIELD, 'Royal Enfield', [BIKES]);
    brand(['hyundai'], F.HYUNDAI, 'Hyundai', [CARS]);
    brand(['tata motors', 'tata'], F.TATA, 'Tata Motors', [CARS, CV]);
    // A brand whose models carry no vehicleType: no categories in the payload.
    brand(['volkswagen'], F.VOLKSWAGEN, 'Volkswagen');

    const model = (
      names: string[],
      id: string,
      name: string,
      mfrId: string,
      mfrName: string,
      category?: AdCategoryV2,
      extra: Partial<SearchTermPayload> = {},
    ) => {
      const payload: SearchTermPayload = {
        modelId: id,
        modelName: name,
        manufacturerId: mfrId,
        manufacturerName: mfrName,
        label: `${mfrName} ${name}`,
        ...(category ? { category } : {}),
        ...extra,
      };
      for (const n of names) {
        this.addTerm(n, SearchTermType.MODEL, payload);
        this.addTerm(`${mfrName} ${n}`, SearchTermType.MODEL, payload, 85);
      }
    };
    model(['swift dzire'], F.SWIFT_DZIRE, 'Swift Dzire', F.MARUTI, 'Maruti Suzuki', CARS);
    model(['swift'], F.SWIFT, 'Swift', F.MARUTI, 'Maruti Suzuki', CARS);
    model(['activa'], F.ACTIVA, 'Activa', F.HONDA_BIKES, 'Honda', BIKES);
    model(['bullet'], F.BULLET, 'Bullet', F.ENFIELD, 'Royal Enfield', BIKES);
    model(['creta'], F.CRETA, 'Creta', F.HYUNDAI, 'Hyundai', CARS);
    model(['i20'], F.I20, 'i20', F.HYUNDAI, 'Hyundai', CARS);
    model(['verna'], F.VERNA, 'Verna', F.HYUNDAI, 'Hyundai', CARS);
    model(['venue'], F.VENUE, 'Venue', F.HYUNDAI, 'Hyundai', CARS);
    model(['nexon'], F.NEXON, 'Nexon', F.TATA, 'Tata Motors', CARS);
    model(['tata ace'], F.ACE, 'Ace', F.TATA, 'Tata Motors', CV, { commercialVehicleType: 'truck' });
    // Model with no derivable category (catalogue row has no vehicleType).
    model(['vento'], F.VENTO, 'Vento', F.VOLKSWAGEN, 'Volkswagen');

    this.addTerm('swift dzire vdi', SearchTermType.VARIANT, {
      variantId: F.DZIRE_VDI,
      variantName: 'VDI',
      modelId: F.SWIFT_DZIRE,
      modelName: 'Swift Dzire',
      manufacturerId: F.MARUTI,
      manufacturerName: 'Maruti Suzuki',
      category: CARS,
      label: 'Swift Dzire VDI',
    });
    this.addTerm('creta sx', SearchTermType.VARIANT, {
      variantId: F.CRETA_SX,
      variantName: 'SX',
      modelId: F.CRETA,
      modelName: 'Creta',
      manufacturerId: F.HYUNDAI,
      manufacturerName: 'Hyundai',
      category: CARS,
      label: 'Creta SX',
    });

    this.addTerm('diesel', SearchTermType.FUEL_TYPE, {
      fuelTypeId: F.DIESEL,
      fuelTypeName: 'Diesel',
      label: 'Diesel',
    });
    this.addTerm('petrol', SearchTermType.FUEL_TYPE, {
      fuelTypeId: F.PETROL,
      fuelTypeName: 'Petrol',
      label: 'Petrol',
    });
    this.addTerm('automatic', SearchTermType.TRANSMISSION, {
      transmissionTypeId: F.AUTOMATIC,
      transmissionTypeName: 'Automatic',
      label: 'Automatic',
    });
    this.addTerm('manual', SearchTermType.TRANSMISSION, {
      transmissionTypeId: F.MANUAL,
      transmissionTypeName: 'Manual',
      label: 'Manual',
    });
  }

  // ---- LexiconService surface used by the parser ----
  get maxNgram(): number {
    return this._maxNgram;
  }
  get isEmpty(): boolean {
    return this.terms.size === 0 && this.locations.size === 0;
  }
  get mode(): LexiconMode {
    if (this.isEmpty) return 'empty';
    const n =
      (this.byType[SearchTermType.MODEL] ?? 0) + (this.byType[SearchTermType.MANUFACTURER] ?? 0);
    return n > 0 ? 'full' : 'hint-only';
  }
  async ensureFresh(): Promise<void> {
    /* always fresh in tests */
  }
  lookupTerm(phrase: string, tokenCount: number): LexiconEntry[] {
    return this.terms.get(`${tokenCount}:${phrase}`) ?? [];
  }
  lookupLocation(phrase: string, tokenCount: number): GazetteerEntry[] {
    return this.locations.get(`${tokenCount}:${phrase}`) ?? [];
  }
  hasToken(token: string): boolean {
    return this.termFuzzy.has(token) || this.locationFuzzy.has(token);
  }
  correctToken(token: string, preferLocation = false): FuzzyHit | null {
    const first = preferLocation ? this.locationFuzzy : this.termFuzzy;
    const second = preferLocation ? this.termFuzzy : this.locationFuzzy;
    return first.correct(token) ?? second.correct(token);
  }
  health(): LexiconHealth {
    return {
      mode: this.mode,
      termPhrases: this.terms.size,
      locationPhrases: this.locations.size,
      byType: { ...this.byType },
      fuzzyVocabulary: this.termFuzzy.size + this.locationFuzzy.size,
      maxNgram: this.maxNgram,
      loadedAt: new Date().toISOString(),
      ageMs: 0,
      lastMaterializedAt: null,
    };
  }
}

export function makeLexicon(opts: { inventory?: boolean } = {}): LexiconService {
  return new LexiconStub(opts) as unknown as LexiconService;
}

export { LocationKind };
