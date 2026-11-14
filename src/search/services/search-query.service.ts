import { Injectable, Logger } from '@nestjs/common';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';
import { AdListingType } from '../../ads/schemas/property-ad.schema';
import { LocationKind } from '../schemas/location-term.schema';
import { SearchTermType } from '../schemas/search-term.schema';
import {
  Ambiguity,
  CATEGORY_STRENGTH_SHARE,
  CategorySource,
  ChipKind,
  Correction,
  MIN_FILTER_CONFIDENCE,
  ParsedQuery,
  QueryStrength,
  SearchChip,
  emptyParsedQuery,
} from '../dto/parsed-query';
import {
  GazetteerEntry,
  LexiconEntry,
  LexiconService,
} from './lexicon.service';
import { extractNumerics, formatMoney } from './numeric-rules';
import {
  IGNORED_TOKENS,
  LOCATIVE_SEPARATORS,
  RawToken,
  tokenize,
} from './text-normalizer';

const VEHICLE_CATEGORIES: ReadonlySet<string> = new Set([
  AdCategoryV2.PRIVATE_VEHICLE,
  AdCategoryV2.COMMERCIAL_VEHICLE,
  AdCategoryV2.TWO_WHEELER,
]);

const ENTITY_TYPES: ReadonlySet<SearchTermType> = new Set([
  SearchTermType.MANUFACTURER,
  SearchTermType.MODEL,
  SearchTermType.VARIANT,
]);

const ATTRIBUTE_TYPES: ReadonlySet<SearchTermType> = new Set([
  SearchTermType.FUEL_TYPE,
  SearchTermType.TRANSMISSION,
  SearchTermType.ATTRIBUTE,
]);

/** How specific a location kind is; a city beats the district containing it. */
const KIND_SPECIFICITY: Record<LocationKind, number> = {
  [LocationKind.CITY]: 4,
  [LocationKind.DISTRICT]: 3,
  [LocationKind.STATE]: 2,
  [LocationKind.COUNTRY]: 1,
};

/**
 * What claimed a token. Drives two things: which tokens stay in the text clause
 * of the hybrid query (entities, attributes and hints do; structural words do
 * not) and the strength classification.
 */
type ConsumedBy = 'structural' | 'entity' | 'attribute' | 'hint';

interface Accumulator {
  category?: {
    value: AdCategoryV2;
    weight: number;
    phrase: string;
    span: [number, number];
    source: CategorySource;
  };
  propertyTypes: Map<string, { label: string; span: [number, number] }>;
  commercialVehicleTypes: Map<string, { label: string; span: [number, number] }>;
  listingType?: { value: AdListingType; label: string; span: [number, number] };
  manufacturers: Map<string, { name: string; span: [number, number] }>;
  models: Map<string, { name: string; span: [number, number] }>;
  variants: Map<string, { name: string; span: [number, number] }>;
  fuelTypes: Map<string, { name: string; span: [number, number] }>;
  transmissions: Map<string, { name: string; span: [number, number] }>;
  location?: { entry: GazetteerEntry; span: [number, number] };
  /** Categories the matched brands sell in (from the materialised payload). */
  brandCategories: Set<string>;
  corrections: Correction[];
  ambiguities: Ambiguity[];
  /** Total weight of vehicle-flavoured evidence vs property-flavoured. */
  vehicleWeight: number;
  propertyWeight: number;
}

/**
 * Turns a raw search string into structured filters.
 *
 * Contract: this service only ever *proposes*. It never reads the database for
 * ads and never decides whether a filter is applied — the caller merges the
 * result under the user's explicit filters, which always win.
 *
 * Two rules the planner relies on:
 *  - `normalized` always carries the whole query and `textQuery` always carries
 *    every non-structural word. Recognising a word never deletes it.
 *  - A seed *hint* ("creta" from the DUAL_HINT list, with no catalogue model
 *    behind it) can suggest a category but never counts as a catalogue match,
 *    so an unmaterialised lexicon degrades to text search, not to "all cars".
 */
@Injectable()
export class SearchQueryService {
  private readonly logger = new Logger(SearchQueryService.name);

  /** Spelling correction against the lexicon. Off only for tests or emergencies. */
  fuzzyEnabled = (process.env.SEARCH_FUZZY_ENABLED ?? 'true').toLowerCase() !== 'false';

  constructor(private readonly lexicon: LexiconService) {}

  async parse(raw: string | undefined | null): Promise<ParsedQuery> {
    const query = (raw ?? '').trim();
    if (!query) return emptyParsedQuery('');

    await this.lexicon.ensureFresh();

    const tokens = tokenize(query);
    if (tokens.length === 0) return emptyParsedQuery(query);

    const normalized = tokens.map((t) => t.text).join(' ');
    const consumed = new Array<boolean>(tokens.length).fill(false);
    const consumedBy = new Array<ConsumedBy | undefined>(tokens.length).fill(undefined);
    const chips: SearchChip[] = [];

    const acc: Accumulator = {
      propertyTypes: new Map(),
      commercialVehicleTypes: new Map(),
      manufacturers: new Map(),
      models: new Map(),
      variants: new Map(),
      fuelTypes: new Map(),
      transmissions: new Map(),
      brandCategories: new Set(),
      corrections: [],
      ambiguities: [],
      vehicleWeight: 0,
      propertyWeight: 0,
    };

    const locationBias = this.computeLocationBias(tokens);
    this.scanNgrams(tokens, consumed, consumedBy, locationBias, acc);

    // Numeric intents over whatever the lexicon did not claim.
    const numerics = extractNumerics(tokens, consumed);
    for (const f of numerics) {
      const isYear = f.field === 'minYear' || f.field === 'maxYear';
      for (const i of f.consumed) {
        if (i < 0 || i >= tokens.length) continue;
        // The year digits themselves stay in the text clause (searchText carries
        // the year); the comparator words and money/BHK tokens are structural.
        consumedBy[i] = isYear && /^\d{4}$/.test(tokens[i].text) ? 'attribute' : 'structural';
      }
    }

    return this.assemble(query, normalized, tokens, consumed, consumedBy, acc, numerics, chips);
  }

  // ---------------------------------------------------------------------------
  // Stage 1 — which tokens sit after a locative preposition
  // ---------------------------------------------------------------------------

  /**
   * "bikes in kollam" → everything after `in` is location-biased, so the
   * gazetteer is consulted before the lexicon there. This is what keeps a place
   * name that is also a product word (a "Pala" bike vs Pala the town) resolving
   * the way the sentence structure implies.
   */
  private computeLocationBias(tokens: RawToken[]): boolean[] {
    const bias = new Array<boolean>(tokens.length).fill(false);
    let lastSeparator = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (LOCATIVE_SEPARATORS.includes(tokens[i].text)) lastSeparator = i;
    }
    if (lastSeparator >= 0) {
      for (let i = lastSeparator + 1; i < tokens.length; i++) bias[i] = true;
    }
    return bias;
  }

  // ---------------------------------------------------------------------------
  // Stage 2 — longest-match n-gram scan, with spelling correction on a miss
  // ---------------------------------------------------------------------------

  private scanNgrams(
    tokens: RawToken[],
    consumed: boolean[],
    consumedBy: (ConsumedBy | undefined)[],
    locationBias: boolean[],
    acc: Accumulator,
  ): void {
    const maxN = Math.max(1, this.lexicon.maxNgram);

    for (let i = 0; i < tokens.length; i++) {
      if (consumed[i]) continue;

      const maxHere = Math.min(maxN, tokens.length - i);
      let matched = false;

      for (let n = maxHere; n >= 1 && !matched; n--) {
        // A run that is already partly consumed cannot form an n-gram.
        let clean = true;
        for (let k = i; k < i + n; k++) if (consumed[k]) { clean = false; break; }
        if (!clean) continue;

        // A bare stop word or preposition is never a term on its own
        // ("for rent" is a term, "for" is not).
        if (n === 1 && IGNORED_TOKENS.has(tokens[i].text)) continue;

        const gram = tokens.slice(i, i + n).map((t) => t.text).join(' ');
        const span: [number, number] = [tokens[i].start, tokens[i + n - 1].end];
        const preferGeo = locationBias[i];

        let lexHits = this.lexicon.lookupTerm(gram, n);
        let geoHits = this.lexicon.lookupLocation(gram, n);
        let corrections: Correction[] = [];

        // Exact miss: try the gram with each unknown token corrected against the
        // vocabulary. Only kept if the corrected gram is a real phrase.
        if (lexHits.length === 0 && geoHits.length === 0 && this.fuzzyEnabled) {
          const fixed = this.correctGram(tokens, i, n, preferGeo);
          if (fixed) {
            lexHits = this.lexicon.lookupTerm(fixed.gram, n);
            geoHits = this.lexicon.lookupLocation(fixed.gram, n);
            if (lexHits.length > 0 || geoHits.length > 0) corrections = fixed.corrections;
          }
        }

        const first = preferGeo ? geoHits : lexHits;
        const second = preferGeo ? lexHits : geoHits;

        let kind: ConsumedBy | undefined;
        if (first.length > 0) {
          if (preferGeo) {
            this.applyLocation(geoHits, span, gram, acc);
            kind = 'structural';
          } else {
            this.applyTerms(lexHits, span, gram, acc);
            kind = SearchQueryService.kindOf(lexHits);
          }
          matched = true;
        } else if (second.length > 0) {
          if (preferGeo) {
            this.applyTerms(lexHits, span, gram, acc);
            kind = SearchQueryService.kindOf(lexHits);
          } else {
            this.applyLocation(geoHits, span, gram, acc);
            kind = 'structural';
          }
          matched = true;
        }

        if (matched) {
          for (let k = i; k < i + n; k++) {
            consumed[k] = true;
            consumedBy[k] = kind;
          }
          acc.corrections.push(...corrections);
          i += n - 1;
        }
      }
    }
  }

  /**
   * Rebuild an n-gram with every unknown token replaced by its unique spelling
   * correction. Returns null when a token cannot be corrected unambiguously or
   * when nothing needed correcting (an exact miss stays a miss).
   */
  private correctGram(
    tokens: RawToken[],
    start: number,
    n: number,
    preferGeo: boolean,
  ): { gram: string; corrections: Correction[] } | null {
    const parts: string[] = [];
    const corrections: Correction[] = [];
    for (let k = start; k < start + n; k++) {
      const t = tokens[k].text;
      if (IGNORED_TOKENS.has(t) || !/\p{L}/u.test(t) || this.lexicon.hasToken(t)) {
        parts.push(t);
        continue;
      }
      const hit = this.lexicon.correctToken(t, preferGeo);
      if (!hit) return null;
      parts.push(hit.to);
      corrections.push({
        from: t,
        to: hit.to,
        via: hit.via,
        sourceSpan: [tokens[k].start, tokens[k].end],
      });
    }
    if (corrections.length === 0) return null;
    return { gram: parts.join(' '), corrections };
  }

  private static kindOf(entries: LexiconEntry[]): ConsumedBy {
    if (entries.some((e) => ENTITY_TYPES.has(e.type) && !e.payload?.hintOnly)) return 'entity';
    if (entries.some((e) => ATTRIBUTE_TYPES.has(e.type))) return 'attribute';
    if (entries.every((e) => e.payload?.hintOnly)) return 'hint';
    return 'structural';
  }

  // ---------------------------------------------------------------------------
  // Stage 3 — apply a matched phrase
  // ---------------------------------------------------------------------------

  private applyTerms(
    entries: LexiconEntry[],
    span: [number, number],
    phrase: string,
    acc: Accumulator,
  ): void {
    // Entries arrive weight-descending; every entry claiming this phrase is
    // applied, because a phrase legitimately carries several facts at once
    // ("bullet" = two-wheeler category + Royal Enfield model).
    for (const entry of entries) {
      const p = entry.payload ?? {};

      if (p.hintOnly) {
        // A hint may suggest a category and nothing else. It never becomes a
        // brand/model filter, so a stale lexicon cannot fabricate one.
        if (p.category) {
          this.setCategory(acc, p.category as AdCategoryV2, entry.weight, phrase, span, 'hint');
          VEHICLE_CATEGORIES.has(p.category)
            ? (acc.vehicleWeight += entry.weight)
            : (acc.propertyWeight += entry.weight);
        }
        continue;
      }

      if (p.category) {
        const source: CategorySource = ENTITY_TYPES.has(entry.type) ? 'entity' : 'seed';
        this.setCategory(acc, p.category as AdCategoryV2, entry.weight, phrase, span, source);
      }
      if (p.propertyType) {
        acc.propertyTypes.set(p.propertyType, {
          label: (p.label as string) ?? p.propertyType,
          span,
        });
        acc.propertyWeight += entry.weight;
      }
      if (p.commercialVehicleType) {
        acc.commercialVehicleTypes.set(p.commercialVehicleType, {
          label: (p.label as string) ?? p.commercialVehicleType,
          span,
        });
        acc.vehicleWeight += entry.weight;
      }
      if (p.listingType && !acc.listingType) {
        acc.listingType = {
          value: p.listingType as AdListingType,
          label: (p.label as string) ?? String(p.listingType),
          span,
        };
      }
      if (p.manufacturerId || p.manufacturerIds?.length) {
        // One brand name may map to several manufacturer documents (one per
        // vehicle category); every id is kept so the filter reaches all of them.
        const ids = p.manufacturerIds?.length ? p.manufacturerIds : [p.manufacturerId as string];
        for (const id of ids) {
          // First mention wins the span: "hyundai creta" keeps the brand chip on
          // "hyundai" even though the model payload names the brand again.
          if (!acc.manufacturers.has(id)) {
            acc.manufacturers.set(id, { name: p.manufacturerName ?? phrase, span });
          }
        }
        for (const c of p.categories ?? []) acc.brandCategories.add(c);
        acc.vehicleWeight += entry.weight;
      }
      if (p.modelId) {
        if (!acc.models.has(p.modelId)) {
          acc.models.set(p.modelId, { name: p.modelName ?? phrase, span });
        }
        acc.vehicleWeight += entry.weight;
      }
      if (p.variantId) {
        acc.variants.set(p.variantId, { name: p.variantName ?? phrase, span });
        acc.vehicleWeight += entry.weight;
      }
      if (p.fuelTypeId) {
        acc.fuelTypes.set(p.fuelTypeId, { name: p.fuelTypeName ?? phrase, span });
        acc.vehicleWeight += entry.weight;
      }
      if (p.transmissionTypeId) {
        acc.transmissions.set(p.transmissionTypeId, {
          name: p.transmissionTypeName ?? phrase,
          span,
        });
        acc.vehicleWeight += entry.weight;
      }

      if (entry.type === SearchTermType.CATEGORY && p.category) {
        VEHICLE_CATEGORIES.has(p.category)
          ? (acc.vehicleWeight += entry.weight)
          : (acc.propertyWeight += entry.weight);
      }
    }
  }

  private setCategory(
    acc: Accumulator,
    value: AdCategoryV2,
    weight: number,
    phrase: string,
    span: [number, number],
    source: CategorySource,
  ): void {
    if (!acc.category) {
      acc.category = { value, weight, phrase, span, source };
      return;
    }
    if (acc.category.value === value) {
      // Reinforcement — keep the earliest span so the chip covers the word the
      // user actually typed first. A real match upgrades a hint.
      acc.category.weight = Math.max(acc.category.weight, weight);
      if (acc.category.source === 'hint' && source !== 'hint') acc.category.source = source;
      return;
    }
    // A hint never argues with a real match, in either direction.
    if (source === 'hint') return;
    if (acc.category.source === 'hint') {
      acc.category = { value, weight, phrase, span, source };
      return;
    }
    if (weight > acc.category.weight) {
      acc.ambiguities.push({
        field: 'category',
        chosen: value,
        alternatives: [acc.category.value],
        phrase,
      });
      acc.category = { value, weight, phrase, span, source };
    } else {
      acc.ambiguities.push({
        field: 'category',
        chosen: acc.category.value,
        alternatives: [value],
        phrase,
      });
    }
  }

  private applyLocation(
    entries: GazetteerEntry[],
    span: [number, number],
    phrase: string,
    acc: Accumulator,
  ): void {
    if (entries.length === 0) return;
    const candidate = entries[0]; // weight-descending

    if (!acc.location) {
      acc.location = { entry: candidate, span };
      return;
    }

    const current = acc.location.entry;
    if (current.slug === candidate.slug) return;

    const currentSpecificity = KIND_SPECIFICITY[current.kind];
    const candidateSpecificity = KIND_SPECIFICITY[candidate.kind];

    // A city inside the already-matched district is a refinement, not a clash.
    if (candidate.district && candidate.district === current.slug) {
      acc.location = { entry: candidate, span };
      return;
    }
    if (current.district && current.district === candidate.slug) return;

    if (candidateSpecificity > currentSpecificity) {
      acc.location = { entry: candidate, span };
      return;
    }
    if (candidateSpecificity === currentSpecificity) {
      acc.ambiguities.push({
        field: 'location',
        chosen: current.slug,
        alternatives: [candidate.slug],
        phrase,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Stage 4 — consistency, chips, strength
  // ---------------------------------------------------------------------------

  private assemble(
    raw: string,
    normalized: string,
    tokens: RawToken[],
    consumed: boolean[],
    consumedBy: (ConsumedBy | undefined)[],
    acc: Accumulator,
    numerics: ReturnType<typeof extractNumerics>,
    chips: SearchChip[],
  ): ParsedQuery {
    const out: ParsedQuery = emptyParsedQuery(raw);
    out.normalized = normalized;

    // --- implied categories -------------------------------------------------
    if (!acc.category) {
      if (acc.propertyTypes.size > 0) {
        const [, meta] = [...acc.propertyTypes.entries()][0];
        acc.category = {
          value: AdCategoryV2.PROPERTY,
          weight: 95,
          phrase: 'implied',
          span: meta.span,
          source: 'implied',
        };
      } else if (acc.commercialVehicleTypes.size > 0) {
        const [, meta] = [...acc.commercialVehicleTypes.entries()][0];
        acc.category = {
          value: AdCategoryV2.COMMERCIAL_VEHICLE,
          weight: 70,
          phrase: 'implied',
          span: meta.span,
          source: 'implied',
        };
      }
    }

    const bedrooms = numerics.find((f) => f.field === 'bedrooms');
    if (bedrooms && !acc.category) {
      acc.category = {
        value: AdCategoryV2.PROPERTY,
        weight: 60,
        phrase: 'implied',
        span: [tokens[0].start, tokens[0].end],
        source: 'implied',
      };
    }

    // A brand that sells in exactly one category decides the category; a brand
    // that sells in several (Honda: cars and bikes) leaves it to the planner,
    // which filters on the whole set instead of dropping the brand.
    if (!acc.category && acc.manufacturers.size > 0 && acc.brandCategories.size === 1) {
      const [, meta] = [...acc.manufacturers.entries()][0];
      acc.category = {
        value: [...acc.brandCategories][0] as AdCategoryV2,
        weight: 75,
        phrase: 'implied',
        span: meta.span,
        source: 'entity',
      };
    }

    // --- cross-category conflict -------------------------------------------
    // Property filters and vehicle filters cannot both be satisfied by one ad,
    // so a query carrying both would return nothing. Drop the weaker side and
    // say so, rather than silently returning an empty page.
    const hasVehicleSignal =
      acc.manufacturers.size > 0 ||
      acc.models.size > 0 ||
      acc.variants.size > 0 ||
      acc.commercialVehicleTypes.size > 0;
    const hasPropertySignal = acc.propertyTypes.size > 0 || !!bedrooms;

    if (hasVehicleSignal && hasPropertySignal) {
      if (acc.vehicleWeight >= acc.propertyWeight) {
        acc.ambiguities.push({
          field: 'category',
          chosen: acc.category?.value ?? AdCategoryV2.PRIVATE_VEHICLE,
          alternatives: [AdCategoryV2.PROPERTY],
          phrase: 'mixed vehicle/property terms',
        });
        acc.propertyTypes.clear();
      } else {
        acc.ambiguities.push({
          field: 'category',
          chosen: AdCategoryV2.PROPERTY,
          alternatives: [acc.category?.value],
          phrase: 'mixed vehicle/property terms',
        });
        acc.manufacturers.clear();
        acc.models.clear();
        acc.variants.clear();
        acc.commercialVehicleTypes.clear();
        acc.brandCategories.clear();
        acc.category = {
          value: AdCategoryV2.PROPERTY,
          weight: 95,
          phrase: 'implied',
          span: acc.category?.span ?? [0, 0],
          source: 'implied',
        };
      }
    }

    // --- project onto the output -------------------------------------------
    const chip = (
      kind: ChipKind,
      label: string,
      filterKey: string,
      filterValue: unknown,
      span: [number, number],
      inferred?: boolean,
    ) => chips.push({ kind, label, filterKey, filterValue, sourceSpan: span, inferred });

    if (acc.category) {
      out.category = acc.category.value;
      out.categorySource = acc.category.source;
      chip(
        'category',
        CATEGORY_LABELS[acc.category.value],
        'category',
        acc.category.value,
        acc.category.span,
        acc.category.source === 'hint' || acc.category.source === 'implied' ? true : undefined,
      );
    } else if (acc.brandCategories.size > 1) {
      out.brandCategories = [...acc.brandCategories] as AdCategoryV2[];
    }
    if (acc.propertyTypes.size > 0) {
      out.propertyTypes = [...acc.propertyTypes.keys()];
      for (const [value, meta] of acc.propertyTypes) {
        chip('property_type', meta.label, 'propertyTypes', value, meta.span);
      }
    }
    if (acc.commercialVehicleTypes.size > 0) {
      out.commercialVehicleTypes = [...acc.commercialVehicleTypes.keys()];
      for (const [value, meta] of acc.commercialVehicleTypes) {
        chip('cv_type', meta.label, 'commercialVehicleTypes', value, meta.span);
      }
    }
    if (acc.listingType) {
      out.listingType = acc.listingType.value;
      chip('listing', acc.listingType.label, 'listingType', acc.listingType.value, acc.listingType.span);
    }
    if (acc.manufacturers.size > 0) {
      out.manufacturerIds = [...acc.manufacturers.keys()];
      // One chip per brand NAME: "honda" is two manufacturer documents but one
      // pill in the UI, carrying every id it stands for.
      const byName = new Map<string, { ids: string[]; span: [number, number] }>();
      for (const [id, meta] of acc.manufacturers) {
        const b = byName.get(meta.name);
        if (b) b.ids.push(id);
        else byName.set(meta.name, { ids: [id], span: meta.span });
      }
      out.manufacturerNames = [...byName.keys()];
      for (const [name, b] of byName) {
        chip('brand', name, 'manufacturerIds', b.ids.length === 1 ? b.ids[0] : b.ids, b.span);
      }
    }
    if (acc.models.size > 0) {
      out.modelIds = [...acc.models.keys()];
      out.modelNames = [...acc.models.values()].map((v) => v.name);
      for (const [id, meta] of acc.models) {
        chip('model', meta.name, 'modelIds', id, meta.span);
      }
    }
    if (acc.variants.size > 0) {
      out.variantIds = [...acc.variants.keys()];
      for (const [id, meta] of acc.variants) chip('variant', meta.name, 'variantIds', id, meta.span);
    }
    if (acc.fuelTypes.size > 0) {
      out.fuelTypeIds = [...acc.fuelTypes.keys()];
      for (const [id, meta] of acc.fuelTypes) chip('fuel', meta.name, 'fuelTypeIds', id, meta.span);
    }
    if (acc.transmissions.size > 0) {
      out.transmissionTypeIds = [...acc.transmissions.keys()];
      for (const [id, meta] of acc.transmissions) {
        chip('transmission', meta.name, 'transmissionTypeIds', id, meta.span);
      }
    }
    if (acc.location) {
      const e = acc.location.entry;
      out.location = {
        kind: e.kind,
        slug: e.slug,
        displayName: e.displayName,
        district: e.district,
        state: e.state,
        centroid: e.centroid,
        radiusKmHint: e.radiusKmHint,
      };
      chip('location', e.displayName, 'location', e.slug, acc.location.span);
    }

    for (const f of numerics) {
      const span = this.spanOf(tokens, f.consumed);
      switch (f.field) {
        case 'minPrice':
          out.minPrice = f.value;
          chip('price', f.label, 'minPrice', f.value, span, f.inferred);
          break;
        case 'maxPrice':
          out.maxPrice = f.value;
          chip('price', f.label, 'maxPrice', f.value, span, f.inferred);
          break;
        case 'minYear':
          out.minYear = f.value;
          // A bare "2020" is recorded as a floor for the legacy filter path, but
          // what the user most likely meant is "a 2020 one": the planner boosts
          // the exact year instead of filtering.
          if (f.inferred) out.exactYear = f.value;
          chip('year', f.label, 'minYear', f.value, span, f.inferred);
          break;
        case 'maxYear':
          out.maxYear = f.value;
          chip('year', f.label, 'maxYear', f.value, span, f.inferred);
          break;
        case 'bedrooms':
          out.bedrooms = f.value;
          chip('bedrooms', f.label, 'bedrooms', f.value, span, f.inferred);
          break;
      }
    }

    // --- corrections --------------------------------------------------------
    out.corrections = acc.corrections;
    const correctedText = new Map<number, string>();
    for (const c of acc.corrections) {
      const idx = tokens.findIndex((t) => t.start === c.sourceSpan[0] && t.end === c.sourceSpan[1]);
      if (idx >= 0) correctedText.set(idx, c.to);
      chip('correction', `${c.from} → ${c.to}`, 'search', c.to, c.sourceSpan, true);
    }
    const textOf = (i: number) => correctedText.get(i) ?? tokens[i].text;

    // --- text terms ---------------------------------------------------------
    // Legacy: what the pre-planner path sends to $text — unclaimed words plus
    // words claimed only by a hint (a hint is not a filter, so the word must
    // still be searched).
    out.freeText = tokens
      .map((t, i) => ({ t, i }))
      .filter(
        ({ t, i }) =>
          !IGNORED_TOKENS.has(t.text) && (!consumed[i] || consumedBy[i] === 'hint'),
      )
      .map(({ i }) => textOf(i))
      .join(' ');

    // Hybrid text clause: everything that is not a structural filter word.
    out.textQuery = tokens
      .map((t, i) => ({ t, i }))
      .filter(
        ({ t, i }) =>
          !IGNORED_TOKENS.has(t.text) &&
          (!consumed[i] || consumedBy[i] !== 'structural'),
      )
      .map(({ i }) => textOf(i))
      .join(' ');

    // --- confidence & strength ---------------------------------------------
    const meaningfulIdx = tokens
      .map((t, i) => (IGNORED_TOKENS.has(t.text) ? -1 : i))
      .filter((i) => i >= 0);
    const recognisedIdx = meaningfulIdx.filter((i) => consumed[i]);
    const share = meaningfulIdx.length === 0 ? 0 : recognisedIdx.length / meaningfulIdx.length;

    let confidence = share;
    confidence -= 0.15 * acc.ambiguities.length;
    confidence -= 0.05 * numerics.filter((f) => f.inferred).length;
    out.confidence = Math.max(0, Math.min(1, Number(confidence.toFixed(3))));

    out.catalogueMatch =
      acc.manufacturers.size > 0 || acc.models.size > 0 || acc.variants.size > 0;
    out.strength = this.classify(meaningfulIdx, recognisedIdx, consumedBy, acc, out.catalogueMatch);

    out.chips = chips.sort((a, b) => a.sourceSpan[0] - b.sourceSpan[0]);
    out.ambiguities = acc.ambiguities;
    out.applyAsFilter =
      out.confidence >= MIN_FILTER_CONFIDENCE &&
      out.strength !== 'weak' &&
      out.strength !== 'none' &&
      // The legacy path can only apply brand/model filters inside a known
      // vehicle category; without one it would drop them silently.
      !(out.catalogueMatch && !out.category);

    return out;
  }

  private classify(
    meaningfulIdx: number[],
    recognisedIdx: number[],
    consumedBy: (ConsumedBy | undefined)[],
    acc: Accumulator,
    catalogueMatch: boolean,
  ): QueryStrength {
    if (meaningfulIdx.length === 0 || recognisedIdx.length === 0) return 'none';
    const share = recognisedIdx.length / meaningfulIdx.length;

    if (catalogueMatch) {
      return share === 1 && acc.ambiguities.length === 0 ? 'strong' : 'partial';
    }
    if (recognisedIdx.every((i) => consumedBy[i] === 'hint')) return 'weak';
    return share >= CATEGORY_STRENGTH_SHARE ? 'category' : 'weak';
  }

  private spanOf(tokens: RawToken[], indices: number[]): [number, number] {
    const valid = indices.filter((i) => i >= 0 && i < tokens.length);
    if (valid.length === 0) return [0, 0];
    return [
      Math.min(...valid.map((i) => tokens[i].start)),
      Math.max(...valid.map((i) => tokens[i].end)),
    ];
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  [AdCategoryV2.PRIVATE_VEHICLE]: 'Cars',
  [AdCategoryV2.TWO_WHEELER]: 'Bikes',
  [AdCategoryV2.COMMERCIAL_VEHICLE]: 'Commercial Vehicles',
  [AdCategoryV2.PROPERTY]: 'Property',
};

export { CATEGORY_LABELS, formatMoney };
