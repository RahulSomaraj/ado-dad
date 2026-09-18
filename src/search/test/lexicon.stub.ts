import {
  GazetteerEntry,
  LexiconEntry,
  LexiconService,
} from '../services/lexicon.service';
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

/**
 * A stand-in for a loaded LexiconService built from the real seed constants
 * plus a small fixture catalogue, so the parser is exercised against the data
 * that will actually ship rather than a hand-made mock.
 */
export class LexiconStub {
  private terms = new Map<string, LexiconEntry[]>();
  private locations = new Map<string, GazetteerEntry[]>();
  private _maxNgram = 1;

  constructor() {
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
    this.addFixtureInventory();
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
  }

  /** Stand-in for what InventoryLexiconMaterializer would produce. */
  private addFixtureInventory(): void {
    const MARUTI = '65b000000000000000000001';
    const HONDA = '65b000000000000000000002';
    const ENFIELD = '65b000000000000000000003';
    const SWIFT_DZIRE = '65b000000000000000000011';
    const ACTIVA = '65b000000000000000000012';
    const BULLET = '65b000000000000000000013';
    const DZIRE_VDI = '65b000000000000000000021';
    const DIESEL = '65b000000000000000000031';
    const AUTOMATIC = '65b000000000000000000041';

    for (const n of ['maruti suzuki', 'maruti', 'suzuki']) {
      this.addTerm(n, SearchTermType.MANUFACTURER, {
        manufacturerId: MARUTI,
        manufacturerName: 'Maruti Suzuki',
        label: 'Maruti Suzuki',
      });
    }
    this.addTerm('honda', SearchTermType.MANUFACTURER, {
      manufacturerId: HONDA,
      manufacturerName: 'Honda',
      label: 'Honda',
    });
    for (const n of ['royal enfield', 'enfield']) {
      this.addTerm(n, SearchTermType.MANUFACTURER, {
        manufacturerId: ENFIELD,
        manufacturerName: 'Royal Enfield',
        label: 'Royal Enfield',
      });
    }

    const dzirePayload: SearchTermPayload = {
      modelId: SWIFT_DZIRE,
      modelName: 'Swift Dzire',
      manufacturerId: MARUTI,
      manufacturerName: 'Maruti Suzuki',
      category: AdCategoryV2.PRIVATE_VEHICLE,
      label: 'Maruti Suzuki Swift Dzire',
    };
    this.addTerm('swift dzire', SearchTermType.MODEL, dzirePayload);
    this.addTerm('maruti suzuki swift dzire', SearchTermType.MODEL, dzirePayload, 85);

    this.addTerm('activa', SearchTermType.MODEL, {
      modelId: ACTIVA,
      modelName: 'Activa',
      manufacturerId: HONDA,
      manufacturerName: 'Honda',
      category: AdCategoryV2.TWO_WHEELER,
      label: 'Honda Activa',
    });
    this.addTerm('bullet', SearchTermType.MODEL, {
      modelId: BULLET,
      modelName: 'Bullet',
      manufacturerId: ENFIELD,
      manufacturerName: 'Royal Enfield',
      category: AdCategoryV2.TWO_WHEELER,
      label: 'Royal Enfield Bullet',
    });

    this.addTerm('swift dzire vdi', SearchTermType.VARIANT, {
      variantId: DZIRE_VDI,
      variantName: 'VDI',
      modelId: SWIFT_DZIRE,
      modelName: 'Swift Dzire',
      manufacturerId: MARUTI,
      manufacturerName: 'Maruti Suzuki',
      category: AdCategoryV2.PRIVATE_VEHICLE,
      label: 'Swift Dzire VDI',
    });

    this.addTerm('diesel', SearchTermType.FUEL_TYPE, {
      fuelTypeId: DIESEL,
      fuelTypeName: 'Diesel',
      label: 'Diesel',
    });
    this.addTerm('automatic', SearchTermType.TRANSMISSION, {
      transmissionTypeId: AUTOMATIC,
      transmissionTypeName: 'Automatic',
      label: 'Automatic',
    });
  }

  // ---- LexiconService surface used by the parser ----
  get maxNgram(): number {
    return this._maxNgram;
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
}

export function makeLexicon(): LexiconService {
  return new LexiconStub() as unknown as LexiconService;
}

export { LocationKind };
