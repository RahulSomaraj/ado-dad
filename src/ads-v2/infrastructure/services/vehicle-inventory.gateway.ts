import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { VehicleInventoryService } from '../../../vehicle-inventory/vehicle-inventory.service';
import { RedisService } from '../../../shared/redis.service';

type InventoryKind =
  | 'manufacturer'
  | 'model'
  | 'variant'
  | 'fuelType'
  | 'transmissionType';

@Injectable()
export class VehicleInventoryGateway {
  /**
   * P1-6: manufacturers, models, variants, fuel types and transmission types
   * are effectively immutable reference data, yet every list response issued
   * five Mongo queries for them (batchFetchInventoryItems) and every detail
   * response issued five more. They are now cached per id for an hour.
   *
   * Cached per id rather than per collection so the list batch path and the
   * single-item detail path share entries.
   */
  private static readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly inventory: VehicleInventoryService,
    private readonly redis: RedisService,
  ) {}

  private cacheKey(kind: InventoryKind, id: string): string {
    return `ads:v2:inventory:${kind}:${id}`;
  }

  /**
   * Read a set of reference items through Redis, loading only the misses.
   *
   * Fails open: any Redis error degrades to a plain database read, matching the
   * behaviour of the rest of the caching in this service.
   */
  private async getByIdsCached(
    kind: InventoryKind,
    ids: string[],
    load: (missingIds: string[]) => Promise<any[]>,
  ): Promise<any[]> {
    if (!ids || ids.length === 0) return [];

    const unique = Array.from(
      new Set(ids.filter(Boolean).map((id) => String(id))),
    );
    if (unique.length === 0) return [];

    const cached = await Promise.all(
      unique.map((id) =>
        this.redis
          .cacheGet<any>(this.cacheKey(kind, id))
          .catch(() => null),
      ),
    );

    const resolved = new Map<string, any>();
    const missing: string[] = [];
    unique.forEach((id, i) => {
      if (cached[i]) resolved.set(id, cached[i]);
      else missing.push(id);
    });

    if (missing.length > 0) {
      const docs = (await load(missing)) || [];
      await Promise.all(
        docs.map(async (doc: any) => {
          const id = String(doc?._id ?? '');
          if (!id) return;
          resolved.set(id, doc);
          try {
            await this.redis.cacheSet(
              this.cacheKey(kind, id),
              doc,
              VehicleInventoryGateway.CACHE_TTL,
            );
          } catch {
            // Best-effort; a write failure just means the next read misses.
          }
        }),
      );
      // Misses that the database did not return simply do not exist — do not
      // cache the negative, the caller's "Not Found" placeholder covers it.
    }

    return unique.map((id) => resolved.get(id)).filter(Boolean);
  }

  private async getOneCached(
    kind: InventoryKind,
    id: string,
    load: (missingIds: string[]) => Promise<any[]>,
  ): Promise<any | null> {
    if (!id) return null;
    const [item] = await this.getByIdsCached(kind, [id], load);
    return item ?? null;
  }

  async assertRefs(
    manufacturerId: string,
    modelId: string,
    variantId?: string,
    transmissionId?: string,
    fuelTypeId?: string,
  ): Promise<void> {
    try {
      // Validate manufacturer
      await this.inventory.findManufacturerById(manufacturerId);
    } catch (error) {
      throw new BadRequestException(
        `Invalid manufacturer ID: ${manufacturerId}`,
      );
    }

    try {
      // Validate model
      await this.inventory.findVehicleModelById(modelId);
    } catch (error) {
      throw new BadRequestException(`Invalid model ID: ${modelId}`);
    }

    if (variantId) {
      try {
        await this.inventory.findVehicleVariantById(variantId);
      } catch (error) {
        throw new BadRequestException(`Invalid variant ID: ${variantId}`);
      }
    }

    if (transmissionId) {
      try {
        await this.inventory.findTransmissionTypeById(transmissionId);
      } catch (error) {
        throw new BadRequestException(
          `Invalid transmission type ID: ${transmissionId}`,
        );
      }
    }

    if (fuelTypeId) {
      try {
        await this.inventory.findFuelTypeById(fuelTypeId);
      } catch (error) {
        throw new BadRequestException(`Invalid fuel type ID: ${fuelTypeId}`);
      }
    }
  }

  /**
   * Like assertRefs, but checks every reference and returns field errors keyed
   * by request path (`<prefix>.manufacturerId`, …) instead of throwing on the
   * first bad one. Undefined optional refs (variant, transmission) are skipped.
   */
  async findInvalidRefs(
    prefix: string,
    refs: {
      manufacturerId?: string;
      modelId?: string;
      variantId?: string;
      transmissionTypeId?: string;
      fuelTypeId?: string;
    },
  ): Promise<Record<string, string>> {
    const checks: [keyof typeof refs, string, (id: string) => Promise<unknown>][] = [
      ['manufacturerId', 'Choose a brand', (id) => this.inventory.findManufacturerById(id)],
      ['modelId', 'Choose a model', (id) => this.inventory.findVehicleModelById(id)],
      ['variantId', 'Choose a valid variant', (id) => this.inventory.findVehicleVariantById(id)],
      ['transmissionTypeId', 'Choose a transmission', (id) => this.inventory.findTransmissionTypeById(id)],
      ['fuelTypeId', 'Choose a fuel type', (id) => this.inventory.findFuelTypeById(id)],
    ];
    const errors: Record<string, string> = {};
    await Promise.all(
      checks.map(async ([field, message, find]) => {
        const id = refs[field];
        if (!id) return;
        try {
          const found = await find(id);
          if (!found) errors[`${prefix}.${field}`] = message;
        } catch (error) {
          // Not found / malformed id → field error; infrastructure errors → 5xx.
          if (error instanceof NotFoundException || error instanceof BadRequestException) {
            errors[`${prefix}.${field}`] = message;
          } else {
            throw error;
          }
        }
      }),
    );
    return errors;
  }

  async getModelName(modelId: string): Promise<string | undefined> {
    try {
      const model = await this.inventory.findVehicleModelById(modelId);
      return (model as any)?.displayName || (model as any)?.name;
    } catch (error) {
      return undefined;
    }
  }

  async getManufacturerName(
    manufacturerId: string,
  ): Promise<string | undefined> {
    try {
      const manufacturer =
        await this.inventory.findManufacturerById(manufacturerId);
      return (manufacturer as any)?.name;
    } catch (error) {
      return undefined;
    }
  }

  async getVariantName(variantId: string): Promise<string | undefined> {
    try {
      const variant = await this.inventory.findVehicleVariantById(variantId);
      return (variant as any)?.name;
    } catch (error) {
      return undefined;
    }
  }

  async getTransmissionTypeName(
    transmissionId: string,
  ): Promise<string | undefined> {
    try {
      const transmission =
        await this.inventory.findTransmissionTypeById(transmissionId);
      return (transmission as any)?.name;
    } catch (error) {
      return undefined;
    }
  }

  async getFuelTypeName(fuelTypeId: string): Promise<string | undefined> {
    try {
      const fuelType = await this.inventory.findFuelTypeById(fuelTypeId);
      return (fuelType as any)?.name;
    } catch (error) {
      return undefined;
    }
  }

  // Methods to get full objects for detailed responses
  async getManufacturer(manufacturerId: string): Promise<any> {
    try {
      const manufacturer = await this.getOneCached(
        'manufacturer',
        manufacturerId,
        (missing) => this.inventory.findManufacturersByIds(missing),
      );
      return (
        manufacturer || {
          _id: manufacturerId,
          name: 'Not Found',
          displayName: 'Not Found',
        }
      );
    } catch (error) {
      return {
        _id: manufacturerId,
        name: 'Not Found',
        displayName: 'Not Found',
      };
    }
  }

  async getModel(modelId: string): Promise<any> {
    try {
      const model = await this.getOneCached('model', modelId, (missing) =>
        this.inventory.findVehicleModelsByIds(missing),
      );
      return (
        model || { _id: modelId, name: 'Not Found', displayName: 'Not Found' }
      );
    } catch (error) {
      return { _id: modelId, name: 'Not Found', displayName: 'Not Found' };
    }
  }

  async getVariant(variantId: string): Promise<any> {
    try {
      const variant = await this.getOneCached('variant', variantId, (missing) =>
        this.inventory.findVehicleVariantsByIds(missing),
      );
      return (
        variant || {
          _id: variantId,
          name: 'Not Found',
          displayName: 'Not Found',
        }
      );
    } catch (error) {
      return { _id: variantId, name: 'Not Found', displayName: 'Not Found' };
    }
  }

  async getTransmissionType(transmissionId: string): Promise<any> {
    try {
      const transmission = await this.getOneCached(
        'transmissionType',
        transmissionId,
        (missing) => this.inventory.findTransmissionTypesByIds(missing),
      );
      return (
        transmission || {
          _id: transmissionId,
          name: 'Not Found',
          displayName: 'Not Found',
        }
      );
    } catch (error) {
      return {
        _id: transmissionId,
        name: 'Not Found',
        displayName: 'Not Found',
      };
    }
  }

  async getFuelType(fuelTypeId: string): Promise<any> {
    try {
      const fuelType = await this.getOneCached(
        'fuelType',
        fuelTypeId,
        (missing) => this.inventory.findFuelTypesByIds(missing),
      );
      return (
        fuelType || {
          _id: fuelTypeId,
          name: 'Not Found',
          displayName: 'Not Found',
        }
      );
    } catch (error) {
      return { _id: fuelTypeId, name: 'Not Found', displayName: 'Not Found' };
    }
  }

  // Batch fetch methods for optimization
  async getManufacturersByIds(ids: string[]): Promise<any[]> {
    return this.getByIdsCached('manufacturer', ids, (missing) =>
      this.inventory.findManufacturersByIds(missing),
    );
  }

  async getModelsByIds(ids: string[]): Promise<any[]> {
    return this.getByIdsCached('model', ids, (missing) =>
      this.inventory.findVehicleModelsByIds(missing),
    );
  }

  async getVariantsByIds(ids: string[]): Promise<any[]> {
    return this.getByIdsCached('variant', ids, (missing) =>
      this.inventory.findVehicleVariantsByIds(missing),
    );
  }

  async getFuelTypesByIds(ids: string[]): Promise<any[]> {
    return this.getByIdsCached('fuelType', ids, (missing) =>
      this.inventory.findFuelTypesByIds(missing),
    );
  }

  async getTransmissionTypesByIds(ids: string[]): Promise<any[]> {
    return this.getByIdsCached('transmissionType', ids, (missing) =>
      this.inventory.findTransmissionTypesByIds(missing),
    );
  }
}
