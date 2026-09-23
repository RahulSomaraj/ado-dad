import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';
import {
  DEFAULT_TERM_WEIGHT,
  SearchTerm,
  SearchTermDocument,
  SearchTermPayload,
  SearchTermType,
} from '../schemas/search-term.schema';
import { countTokens, normalizePhrase } from './text-normalizer';
import { LexiconService } from './lexicon.service';

/**
 * Hand-written aliases that no catalogue field contains. Keyed by the
 * normalized manufacturer name as it is stored in vehicle-inventory.
 */
export const MANUFACTURER_ALIASES: Readonly<Record<string, string[]>> = {
  'maruti suzuki': ['maruti', 'suzuki', 'msil'],
  'royal enfield': ['enfield', 're', 'bullet company'],
  volkswagen: ['vw'],
  'mercedes benz': ['mercedes', 'benz'],
  'tata motors': ['tata'],
  'mahindra and mahindra': ['mahindra'],
  'hero motocorp': ['hero'],
  'bajaj auto': ['bajaj'],
  'tvs motor': ['tvs'],
  'honda motorcycle and scooter india': ['honda'],
  'ashok leyland': ['leyland'],
  'force motors': ['force'],
};

/**
 * Anything shorter than this is not materialized on its own — one- and
 * two-character "models" collide with ordinary words and would hijack queries.
 * They can still be reached as part of a longer phrase.
 */
const MIN_TERM_LENGTH = 3;

/**
 * Model names that are ordinary English words. Materializing these as models
 * would let "city" in "city centre flat" pull the user into Honda City, so they
 * are only matched as part of a longer phrase (e.g. "honda city").
 */
const UNSAFE_STANDALONE_MODELS: ReadonlySet<string> = new Set([
  'city', 'civic', 'accord', 'jazz', 'figo', 'classic', 'eco', 'super',
  'passion', 'glamour', 'pleasure', 'access', 'star', 'ace', 'grand',
  'freedom', 'shine', 'hunter', 'meteor', 'ray', 'wave', 'max', 'king',
]);

interface MaterializeResult {
  manufacturers: number;
  models: number;
  variants: number;
  fuelTypes: number;
  transmissions: number;
  removed: number;
}

/**
 * Rebuilds the `source: 'inventory'` half of the lexicon from vehicle-inventory.
 *
 * Runs at boot (behind a flag) and can be triggered on demand. It only ever
 * touches rows it owns, so a curated alias added by hand in `source: 'seed'` is
 * never clobbered by a rebuild.
 */
@Injectable()
export class InventoryLexiconMaterializer {
  private readonly logger = new Logger(InventoryLexiconMaterializer.name);

  constructor(
    @InjectModel(SearchTerm.name)
    private readonly searchTermModel: Model<SearchTermDocument>,
    @InjectModel('Manufacturer') private readonly manufacturerModel: Model<any>,
    @InjectModel('VehicleModel') private readonly vehicleModelModel: Model<any>,
    @InjectModel('VehicleVariant') private readonly variantModel: Model<any>,
    @InjectModel('FuelType') private readonly fuelTypeModel: Model<any>,
    @InjectModel('TransmissionType') private readonly transmissionModel: Model<any>,
    private readonly lexicon: LexiconService,
  ) {}

  async materialize(): Promise<MaterializeResult> {
    const rows: Array<{
      term: string;
      tokenCount: number;
      type: SearchTermType;
      payload: SearchTermPayload;
      weight: number;
    }> = [];

    const push = (
      phrase: string,
      type: SearchTermType,
      payload: SearchTermPayload,
      weightDelta = 0,
    ) => {
      const term = normalizePhrase(phrase);
      if (!term || term.length < MIN_TERM_LENGTH) return;
      const tokenCount = countTokens(term);
      if (
        tokenCount === 1 &&
        type === SearchTermType.MODEL &&
        UNSAFE_STANDALONE_MODELS.has(term)
      ) {
        return;
      }
      rows.push({
        term,
        tokenCount,
        type,
        payload,
        weight: DEFAULT_TERM_WEIGHT[type] + weightDelta,
      });
    };

    // ---- load the catalogue --------------------------------------------------
    const [manufacturers, models] = await Promise.all([
      this.manufacturerModel
        .find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
        .select('_id name displayName vehicleCategory')
        .lean()
        .exec(),
      this.vehicleModelModel
        .find({ isDeleted: { $ne: true } })
        .select('_id name displayName manufacturer vehicleType isCommercialVehicle commercialVehicleType')
        .lean()
        .exec(),
    ]);

    // Which ad categories each brand sells in, derived from its models. A brand
    // with exactly one category lets the parser decide the category on its own;
    // Honda (cars + bikes are separate manufacturer docs, but "honda" resolves
    // to both) carries the whole set so the planner filters on all of them.
    const categoriesByManufacturer = new Map<string, Set<string>>();
    const uncategorised: string[] = [];
    for (const mdl of models as any[]) {
      const category = this.categoryOf(mdl);
      if (!category) {
        uncategorised.push(`${mdl.displayName || mdl.name} (${mdl._id})`);
        continue;
      }
      const key = String(mdl.manufacturer);
      const set = categoriesByManufacturer.get(key) ?? new Set<string>();
      set.add(category);
      categoriesByManufacturer.set(key, set);
    }
    if (uncategorised.length > 0) {
      this.logger.warn(
        `${uncategorised.length} catalogue model(s) have no vehicleType/isCommercialVehicle and cannot be ` +
          `categorised — searches for them fall back to text: ${uncategorised.slice(0, 10).join(', ')}` +
          (uncategorised.length > 10 ? ', …' : ''),
      );
    }

    // ---- manufacturers -----------------------------------------------------
    const manufacturerById = new Map<string, any>();
    for (const m of manufacturers as any[]) {
      manufacturerById.set(String(m._id), m);
      const categories = [...(categoriesByManufacturer.get(String(m._id)) ?? [])];
      const payload: SearchTermPayload = {
        manufacturerId: String(m._id),
        manufacturerName: m.displayName || m.name,
        label: m.displayName || m.name,
        ...(categories.length > 0 ? { categories } : {}),
      };
      const names = new Set<string>([m.name, m.displayName].filter(Boolean));
      for (const alias of MANUFACTURER_ALIASES[normalizePhrase(m.name)] ?? []) {
        names.add(alias);
      }
      for (const n of names) push(n, SearchTermType.MANUFACTURER, payload);
    }

    // ---- models ------------------------------------------------------------
    const modelById = new Map<string, any>();
    for (const mdl of models as any[]) {
      modelById.set(String(mdl._id), mdl);
      const manufacturer = manufacturerById.get(String(mdl.manufacturer));
      const category = this.categoryOf(mdl);
      const payload: SearchTermPayload = {
        modelId: String(mdl._id),
        modelName: mdl.displayName || mdl.name,
        label: [manufacturer?.displayName, mdl.displayName || mdl.name]
          .filter(Boolean)
          .join(' '),
        ...(manufacturer
          ? {
              manufacturerId: String(manufacturer._id),
              manufacturerName: manufacturer.displayName || manufacturer.name,
            }
          : {}),
        ...(category ? { category } : {}),
        ...(InventoryLexiconMaterializer.isCommercial(mdl) && mdl.commercialVehicleType
          ? { commercialVehicleType: mdl.commercialVehicleType }
          : {}),
      };

      const names = new Set<string>([mdl.name, mdl.displayName].filter(Boolean));
      for (const n of names) {
        push(n, SearchTermType.MODEL, payload);
        // "maruti swift" as one phrase outranks the bare model name, which is
        // what makes a brand+model query land on the exact model.
        if (manufacturer) {
          push(
            `${manufacturer.displayName || manufacturer.name} ${n}`,
            SearchTermType.MODEL,
            payload,
            5,
          );
        }
      }
    }

    // ---- variants ----------------------------------------------------------
    const variants = await this.variantModel
      .find({ isDeleted: { $ne: true } })
      .select('_id name displayName vehicleModel')
      .lean()
      .exec();

    for (const v of variants as any[]) {
      const mdl = modelById.get(String(v.vehicleModel));
      if (!mdl) continue;
      const manufacturer = manufacturerById.get(String(mdl.manufacturer));
      const category = this.categoryOf(mdl);
      const payload: SearchTermPayload = {
        variantId: String(v._id),
        variantName: v.displayName || v.name,
        modelId: String(mdl._id),
        modelName: mdl.displayName || mdl.name,
        label: [mdl.displayName || mdl.name, v.displayName || v.name]
          .filter(Boolean)
          .join(' '),
        ...(manufacturer
          ? {
              manufacturerId: String(manufacturer._id),
              manufacturerName: manufacturer.displayName || manufacturer.name,
            }
          : {}),
        ...(category ? { category } : {}),
      };
      // A bare variant name ("VDI", "ZXI") is far too generic on its own; only
      // the model-qualified phrase is materialized.
      for (const n of [v.name, v.displayName].filter(Boolean)) {
        push(`${mdl.displayName || mdl.name} ${n}`, SearchTermType.VARIANT, payload);
      }
    }

    // ---- fuel + transmission ----------------------------------------------
    const fuelTypes = await this.fuelTypeModel
      .find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
      .select('_id name displayName')
      .lean()
      .exec();
    for (const f of fuelTypes as any[]) {
      const payload: SearchTermPayload = {
        fuelTypeId: String(f._id),
        fuelTypeName: f.displayName || f.name,
        label: f.displayName || f.name,
      };
      for (const n of [f.name, f.displayName].filter(Boolean)) {
        push(n, SearchTermType.FUEL_TYPE, payload);
      }
    }

    const transmissions = await this.transmissionModel
      .find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
      .select('_id name displayName')
      .lean()
      .exec();
    for (const t of transmissions as any[]) {
      const payload: SearchTermPayload = {
        transmissionTypeId: String(t._id),
        transmissionTypeName: t.displayName || t.name,
        label: t.displayName || t.name,
      };
      for (const n of [t.name, t.displayName].filter(Boolean)) {
        push(n, SearchTermType.TRANSMISSION, payload);
      }
    }

    // ---- write -------------------------------------------------------------
    // Deduplicate on (term, type): the unique index is (term, type, source), so
    // two models sharing a name would otherwise collide. Highest weight wins;
    // both remain reachable through their brand-qualified phrase.
    const deduped = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const key = `${r.term}|${r.type}`;
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, r);
        continue;
      }
      const union = (a?: string[], aOne?: string, b?: string[], bOne?: string) =>
        [...new Set([...(a ?? (aOne ? [aOne] : [])), ...(b ?? (bOne ? [bOne] : []))])];
      if (r.type === SearchTermType.MANUFACTURER && existing.type === SearchTermType.MANUFACTURER) {
        // Same brand name, different manufacturer documents (one per vehicle
        // category). Keep every id and every category, so "honda" reaches both
        // the car and the bike catalogue instead of whichever came first.
        const categories = new Set<string>([
          ...(existing.payload.categories ?? []),
          ...(r.payload.categories ?? []),
        ]);
        existing.payload = {
          ...existing.payload,
          manufacturerIds: union(existing.payload.manufacturerIds, existing.payload.manufacturerId, r.payload.manufacturerIds, r.payload.manufacturerId),
          ...(categories.size > 0 ? { categories: [...categories] } : {}),
        };
        existing.weight = Math.max(existing.weight, r.weight);
        continue;
      }
      if (r.type === SearchTermType.MODEL && existing.type === SearchTermType.MODEL) {
        // Same model name filed twice in the catalogue ("I-Pace" and "Jaguar
        // I-Pace", or the same name under two manufacturer documents). Searching
        // the phrase must reach every one of them, so the ids are merged; the
        // higher-weight entry keeps the label and category.
        const keep = r.weight > existing.weight ? r : existing;
        const other = keep === r ? existing : r;
        keep.payload = {
          ...keep.payload,
          modelIds: union(keep.payload.modelIds, keep.payload.modelId, other.payload.modelIds, other.payload.modelId),
          manufacturerIds: union(keep.payload.manufacturerIds, keep.payload.manufacturerId, other.payload.manufacturerIds, other.payload.manufacturerId),
          ...(keep.payload.category || !other.payload.category ? {} : { category: other.payload.category }),
        };
        keep.weight = Math.max(existing.weight, r.weight);
        deduped.set(key, keep);
        continue;
      }
      if (r.type === SearchTermType.VARIANT && existing.type === SearchTermType.VARIANT) {
        const keep = r.weight > existing.weight ? r : existing;
        const other = keep === r ? existing : r;
        keep.payload = {
          ...keep.payload,
          variantIds: union(keep.payload.variantIds, keep.payload.variantId, other.payload.variantIds, other.payload.variantId),
          modelIds: union(keep.payload.modelIds, keep.payload.modelId, other.payload.modelIds, other.payload.modelId),
        };
        deduped.set(key, keep);
        continue;
      }
      if (r.weight > existing.weight) deduped.set(key, r);
    }

    const ops = [...deduped.values()].map((r) => ({
      updateOne: {
        filter: { term: r.term, type: r.type, source: 'inventory' },
        update: {
          $set: {
            term: r.term,
            tokenCount: r.tokenCount,
            type: r.type,
            payload: r.payload,
            weight: r.weight,
            isActive: true,
            source: 'inventory',
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      for (let i = 0; i < ops.length; i += 500) {
        await this.searchTermModel.bulkWrite(ops.slice(i, i + 500), { ordered: false });
      }
    }

    // Drop inventory rows that no longer correspond to anything.
    const liveTerms = [...deduped.values()].map((r) => r.term);
    const removal = await this.searchTermModel.deleteMany({
      source: 'inventory',
      term: { $nin: liveTerms },
    });

    await this.lexicon.reload();

    const result: MaterializeResult = {
      manufacturers: manufacturers.length,
      models: models.length,
      variants: variants.length,
      fuelTypes: fuelTypes.length,
      transmissions: transmissions.length,
      removed: removal.deletedCount ?? 0,
    };
    this.logger.log(`Inventory lexicon materialized: ${JSON.stringify(result)}`);
    return result;
  }

  /** Map a catalogue model onto the ad category its ads are filed under. */
  private categoryOf(model: any): AdCategoryV2 | undefined {
    // Only the explicit flag (or a truck body) makes a model commercial. The
    // catalogue import writes `commercialVehicleType: 'passenger'` onto
    // ordinary cars as a body class, so that field alone is NOT evidence —
    // treating it as such filed every Creta under Commercial Vehicles.
    if (InventoryLexiconMaterializer.isCommercial(model)) {
      return AdCategoryV2.COMMERCIAL_VEHICLE;
    }
    if (model.vehicleType === VehicleTypes.TWOWHEELER) {
      return AdCategoryV2.TWO_WHEELER;
    }
    if (model.vehicleType) return AdCategoryV2.PRIVATE_VEHICLE;
    return undefined;
  }

  /** The single definition of "this catalogue model is a commercial vehicle". */
  static isCommercial(model: any): boolean {
    return model?.isCommercialVehicle === true || model?.vehicleType === VehicleTypes.TRUCK;
  }
}
