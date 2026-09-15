import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import {
  FuelType,
  FuelTypeDocument,
} from '../vehicle-inventory/schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeDocument,
} from '../vehicle-inventory/schemas/transmission-type.schema';
import {
  CommercialVehicleType,
  CommercialVehicleTypeDocument,
} from '../vehicle-inventory/schemas/commercial-vehicle-type.schema';
import { BodyTypeEnum } from '../ads/schemas/commercial-vehicle-ad.schema';
import {
  BODY_TYPE_LABELS,
  INVENTORY_TYPE_CATEGORY,
  MANUFACTURER_CATEGORY,
  PROPERTY_TYPES,
  SELL_COLORS,
  SELL_CONFIG_VERSION,
  SELL_FEATURES,
  SELL_SHOT_LISTS,
  SellCategory,
  sellLimits,
} from './sell.constants';

export interface SellConfigRef {
  id: string;
  name: string;
  displayName: string;
}

export interface SellConfig {
  version: string;
  category: SellCategory;
  limits: ReturnType<typeof sellLimits>;
  fuelTypes: SellConfigRef[];
  transmissionTypes: SellConfigRef[];
  commercialVehicleTypes: SellConfigRef[];
  bodyTypes: { value: string; label: string }[];
  propertyTypes: { value: string; label: string; residential: boolean }[];
  manufacturerCategory: string | null;
  features: string[];
  shotList: string[];
  colors: { value: string; label: string; hex: string }[];
}

const CACHE_MS = 5 * 60 * 1000;

@Injectable()
export class SellConfigService {
  private readonly logger = new Logger(SellConfigService.name);
  private readonly cache = new Map<
    SellCategory,
    { at: number; body: SellConfig; etag: string }
  >();
  private commercialNames?: { at: number; names: Set<string> };

  constructor(
    @InjectModel(FuelType.name)
    private readonly fuelTypeModel: Model<FuelTypeDocument>,
    @InjectModel(TransmissionType.name)
    private readonly transmissionTypeModel: Model<TransmissionTypeDocument>,
    @InjectModel(CommercialVehicleType.name)
    private readonly commercialTypeModel: Model<CommercialVehicleTypeDocument>,
  ) {}

  async getConfig(
    category: SellCategory,
    now: Date = new Date(),
  ): Promise<{ body: SellConfig; etag: string }> {
    const hit = this.cache.get(category);
    if (hit && now.getTime() - hit.at < CACHE_MS) {
      return { body: hit.body, etag: hit.etag };
    }
    const body = await this.build(category, now);
    const etag = `"${createHash('sha1').update(JSON.stringify(body)).digest('base64url')}"`;
    this.cache.set(category, { at: now.getTime(), body, etag });
    return { body, etag };
  }

  /** Active commercial vehicle type names (cached 5 min) for the create validator. */
  async getActiveCommercialTypeNames(): Promise<Set<string>> {
    const now = Date.now();
    if (this.commercialNames && now - this.commercialNames.at < CACHE_MS) {
      return this.commercialNames.names;
    }
    const docs = await this.activeCommercialTypes();
    const names = new Set(docs.map((d) => d.name));
    this.commercialNames = { at: now, names };
    return names;
  }

  private async build(category: SellCategory, now: Date): Promise<SellConfig> {
    const isVehicle = category !== 'property';
    const typeCategory = INVENTORY_TYPE_CATEGORY[category];

    const [fuelTypes, transmissionTypes, commercialTypes] = await Promise.all([
      isVehicle ? this.activeRefs(this.fuelTypeModel, typeCategory) : [],
      isVehicle
        ? this.activeRefs(this.transmissionTypeModel, typeCategory)
        : [],
      category === 'commercial_vehicle' ? this.activeCommercialTypes() : [],
    ]);

    return {
      version: SELL_CONFIG_VERSION,
      category,
      limits: sellLimits(category, now),
      fuelTypes,
      transmissionTypes,
      commercialVehicleTypes: commercialTypes,
      bodyTypes:
        category === 'commercial_vehicle'
          ? Object.values(BodyTypeEnum).map((v) => ({
              value: v,
              label: BODY_TYPE_LABELS[v] ?? v,
            }))
          : [],
      propertyTypes: category === 'property' ? PROPERTY_TYPES : [],
      manufacturerCategory: MANUFACTURER_CATEGORY[category],
      features: SELL_FEATURES[category],
      shotList: SELL_SHOT_LISTS[category],
      colors: isVehicle ? SELL_COLORS : [],
    };
  }

  /**
   * Active, non-deleted fuel/transmission types sorted by sortOrder.
   * Same rule as the app's `appliesTo(category)`: a document with a
   * `vehicleCategory` only applies to that category; without one it applies
   * to all. (The FuelType `category` field is a fuel family — liquid/gas/… —
   * not a vehicle category, so it is deliberately ignored here.)
   */
  private async activeRefs(
    model: Model<any>,
    vehicleCategory: string | null,
  ): Promise<SellConfigRef[]> {
    const docs: any[] = await model
      .find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();
    return docs
      .filter((d) => {
        const own = typeof d.vehicleCategory === 'string' ? d.vehicleCategory : '';
        return !vehicleCategory || !own || own === vehicleCategory;
      })
      .map((d) => ({
        id: String(d._id),
        name: String(d.name),
        displayName: String(d.displayName ?? d.name),
      }));
  }

  private async activeCommercialTypes(): Promise<SellConfigRef[]> {
    const docs: any[] = await this.commercialTypeModel
      .find({ isDeleted: { $ne: true }, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();
    return docs.map((d) => ({
      id: String(d._id),
      name: String(d.name),
      displayName: String(d.displayName ?? d.name),
    }));
  }
}
