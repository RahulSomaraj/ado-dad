import { Injectable, Logger } from '@nestjs/common';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';
import { AdListingType } from '../../ads/schemas/property-ad.schema';
import { LocationKind } from '../schemas/location-term.schema';
import { SearchTermType } from '../schemas/search-term.schema';
import {
  Ambiguity,
  ChipKind,
  MIN_FILTER_CONFIDENCE,
  ParsedQuery,
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

/** How specific a location kind is; a city beats the district containing it. */
const KIND_SPECIFICITY: Record<LocationKind, number> = {
  [LocationKind.CITY]: 4,
  [LocationKind.DISTRICT]: 3,
  [LocationKind.STATE]: 2,
  [LocationKind.COUNTRY]: 1,
};

interface Accumulator {
  category?: { value: AdCategoryV2; weight: number; phrase: string; span: [number, number] };
  propertyTypes: Map<string, { label: string; span: [number, number] }>;
  commercialVehicleTypes: Map<string, { label: string; span: [number, number] }>;
  listingType?: { value: AdListingType; label: string; span: [number, number] };
  manufacturers: Map<string, { name: string; span: [number, number] }>;
  models: Map<string, { name: string; span: [number, number] }>;
  variants: Map<string, { name: string; span: [number, number] }>;
  fuelTypes: Map<string, { name: string; span: [number, number] }>;
  transmissions: Map<string, { name: string; span: [number, number] }>;
  location?: { entry: GazetteerEntry; span: [number, number] };
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
 * result under the user's explicit filters, which always win, and consults
 * `applyAsFilter` before hard-filtering on anything here.
 */
@Injectable()
export class SearchQueryService {
  private readonly logger = new Logger(SearchQueryService.name);

  constructor(private readonly lexicon: LexiconService) {}

  async parse(raw: string | undefined | null): Promise<ParsedQuery> {
    const query = (raw ?? '').trim();
    if (!query) return emptyParsedQuery('');

    await this.lexicon.ensureFresh();

    const tokens = tokenize(query);
    if (tokens.length === 0) return emptyParsedQuery(query);

    const normalized = tokens.map((t) => t.text).join(' ');
    const consumed = new Array<boolean>(tokens.length).fill(false);
    const chips: SearchChip[] = [];

    const acc: Accumulator = {
      propertyTypes: new Map(),
      commercialVehicleTypes: new Map(),
      manufacturers: new Map(),
      models: new Map(),
      variants: new Map(),
      fuelTypes: new Map(),
      transmissions: new Map(),
      ambiguities: [],
      vehicleWeight: 0,
      propertyWeight: 0,
    };

    const locationBias = this.computeLocationBias(tokens);
    this.scanNgrams(tokens, consumed, locationBias, acc);

    // Numeric intents over whatever the lexicon did not claim.
    const numerics = extractNumerics(tokens, consumed);

    const parsed = this.assemble(query, normalized, tokens, consumed, acc, numerics, chips);
    return parsed;
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
  // Stage 2 — longest-match n-gram scan
  // ---------------------------------------------------------------------------

  private scanNgrams(
    tokens: RawToken[],
    consumed: boolean[],
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

        const lexHits = this.lexicon.lookupTerm(gram, n);
        const geoHits = this.lexicon.lookupLocation(gram, n);

        const preferGeo = locationBias[i];
        const first = preferGeo ? geoHits : lexHits;
        const second = preferGeo ? lexHits : geoHits;

        if (first.length > 0) {
          preferGeo
            ? this.applyLocation(geoHits, span, gram, acc)
            : this.applyTerms(lexHits, span, gram, acc);
          matched = true;
        } else if (second.length > 0) {
          preferGeo
            ? this.applyTerms(lexHits, span, gram, acc)
            : this.applyLocation(geoHits, span, gram, acc);
          matched = true;
        }

        if (matched) {
          for (let k = i; k < i + n; k++) consumed[k] = true;
          i += n - 1;
        }
      }
    }
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

      if (p.category) {
        this.setCategory(acc, p.category as AdCategoryV2, entry.weight, phrase, span);
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
      if (p.manufacturerId) {
        acc.manufacturers.set(p.manufacturerId, {
          name: p.manufacturerName ?? phrase,
          span,
        });
        acc.vehicleWeight += entry.weight;
      }
      if (p.modelId) {
        acc.models.set(p.modelId, { name: p.modelName ?? phrase, span });
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
  ): void {
    if (!acc.category) {
      acc.category = { value, weight, phrase, span };
      return;
    }
    if (acc.category.value === value) {
      // Reinforcement — keep the earliest span so the chip covers the word the
      // user actually typed first.
      acc.category.weight = Math.max(acc.category.weight, weight);
      return;
    }
    if (weight > acc.category.weight) {
      acc.ambiguities.push({
        field: 'category',
        chosen: value,
        alternatives: [acc.category.value],
        phrase,
      });
      acc.category = { value, weight, phrase, span };
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
  // Stage 4 — consistency, chips, confidence
  // ---------------------------------------------------------------------------

  private assemble(
    raw: string,
    normalized: string,
    tokens: RawToken[],
    consumed: boolean[],
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
        };
      } else if (acc.commercialVehicleTypes.size > 0) {
        const [, meta] = [...acc.commercialVehicleTypes.entries()][0];
        acc.category = {
          value: AdCategoryV2.COMMERCIAL_VEHICLE,
          weight: 70,
          phrase: 'implied',
          span: meta.span,
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
        acc.category = {
          value: AdCategoryV2.PROPERTY,
          weight: 95,
          phrase: 'implied',
          span: acc.category?.span ?? [0, 0],
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
      chip('category', CATEGORY_LABELS[acc.category.value], 'category', acc.category.value, acc.category.span);
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
      out.manufacturerNames = [...acc.manufacturers.values()].map((v) => v.name);
      for (const [id, meta] of acc.manufacturers) {
        chip('brand', meta.name, 'manufacturerIds', id, meta.span);
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

    // --- leftovers ----------------------------------------------------------
    out.freeText = tokens
      .filter((t, i) => !consumed[i] && !IGNORED_TOKENS.has(t.text))
      .map((t) => t.text)
      .join(' ');

    // --- confidence ---------------------------------------------------------
    const meaningful = tokens.filter((t) => !IGNORED_TOKENS.has(t.text));
    const meaningfulConsumed = tokens.filter(
      (t, i) => consumed[i] && !IGNORED_TOKENS.has(t.text),
    );
    let confidence = meaningful.length === 0 ? 0 : meaningfulConsumed.length / meaningful.length;
    confidence -= 0.15 * acc.ambiguities.length;
    confidence -= 0.05 * numerics.filter((f) => f.inferred).length;
    out.confidence = Math.max(0, Math.min(1, Number(confidence.toFixed(3))));

    out.chips = chips.sort((a, b) => a.sourceSpan[0] - b.sourceSpan[0]);
    out.ambiguities = acc.ambiguities;
    out.applyAsFilter = out.confidence >= MIN_FILTER_CONFIDENCE;

    return out;
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
