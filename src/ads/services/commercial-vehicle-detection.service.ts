import { Injectable } from '@nestjs/common';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../schemas/commercial-vehicle-ad.schema';

export interface CommercialVehicleDefaults {
  isCommercialVehicle: boolean;
  commercialVehicleType?: CommercialVehicleTypeEnum;
  bodyType?: BodyTypeEnum;
  payloadCapacity?: number;
  payloadUnit?: string;
  axleCount?: number;
  seatingCapacity?: number;
}

@Injectable()
export class CommercialVehicleDetectionService {
  constructor(
    private readonly vehicleInventoryService: VehicleInventoryService,
  ) {}

  /**
   * Detect if a vehicle model is commercial and return default values
   */
  async detectCommercialVehicleDefaults(
    modelId: string,
  ): Promise<CommercialVehicleDefaults> {
    try {
      const model =
        await this.vehicleInventoryService.findVehicleModelById(modelId);

      if (!model) {
        return { isCommercialVehicle: false };
      }

      // Check if model is explicitly marked as commercial
      if (model.isCommercialVehicle) {
        return {
          isCommercialVehicle: true,
          commercialVehicleType: this.mapCommercialVehicleType(
            model.commercialVehicleType,
          ),
          bodyType: this.mapBodyType(model.commercialBodyType),
          payloadCapacity: model.defaultPayloadCapacity,
          payloadUnit: model.defaultPayloadUnit,
          axleCount: model.defaultAxleCount,
          seatingCapacity: model.defaultSeatingCapacity,
        };
      }

      // Auto-detect based on vehicle type
      const isCommercial = this.isCommercialVehicleType(model.vehicleType);

      if (isCommercial) {
        return {
          isCommercialVehicle: true,
          commercialVehicleType: this.mapVehicleTypeToCommercialType(
            model.vehicleType,
          ),
          bodyType: this.mapVehicleTypeToBodyType(model.vehicleType),
          payloadCapacity:
            model.defaultPayloadCapacity ||
            this.getDefaultPayloadCapacity(model.vehicleType),
          payloadUnit: model.defaultPayloadUnit || 'kg',
          axleCount:
            model.defaultAxleCount ||
            this.getDefaultAxleCount(model.vehicleType),
          seatingCapacity:
            model.defaultSeatingCapacity ||
            this.getDefaultSeatingCapacity(model.vehicleType),
        };
      }

      return { isCommercialVehicle: false };
    } catch (error) {
      console.error('Error detecting commercial vehicle defaults:', error);
      return { isCommercialVehicle: false };
    }
  }

  /**
   * Check if a vehicle type is commercial
   */
  private isCommercialVehicleType(vehicleType: VehicleTypes): boolean {
    const commercialTypes = [
      VehicleTypes.TRUCK,
      // Add other commercial types as needed
    ];
    return commercialTypes.includes(vehicleType);
  }

  /**
   * Map vehicle type to commercial vehicle type
   */
  private mapVehicleTypeToCommercialType(
    vehicleType: VehicleTypes,
  ): CommercialVehicleTypeEnum {
    const mapping: Record<VehicleTypes, CommercialVehicleTypeEnum> = {
      [VehicleTypes.TRUCK]: CommercialVehicleTypeEnum.TRUCK,
      [VehicleTypes.SUV]: CommercialVehicleTypeEnum.VAN, // Some SUVs can be commercial
      [VehicleTypes.SEDAN]: CommercialVehicleTypeEnum.VAN, // Some sedans can be commercial
      [VehicleTypes.HATCHBACK]: CommercialVehicleTypeEnum.VAN,
      [VehicleTypes.COUPE]: CommercialVehicleTypeEnum.VAN,
      [VehicleTypes.CONVERTIBLE]: CommercialVehicleTypeEnum.VAN,
      [VehicleTypes.TWOWHEELER]: CommercialVehicleTypeEnum.VAN,
      [VehicleTypes.MUV]: CommercialVehicleTypeEnum.VAN,
      [VehicleTypes.COMPACT_SUV]: CommercialVehicleTypeEnum.VAN,
      [VehicleTypes.SUB_COMPACT_SUV]: CommercialVehicleTypeEnum.VAN,
    };
    return mapping[vehicleType] || CommercialVehicleTypeEnum.TRUCK;
  }

  /**
   * Map vehicle type to body type
   */
  private mapVehicleTypeToBodyType(vehicleType: VehicleTypes): BodyTypeEnum {
    const mapping: Record<VehicleTypes, BodyTypeEnum> = {
      [VehicleTypes.TRUCK]: BodyTypeEnum.FLATBED,
      [VehicleTypes.SUV]: BodyTypeEnum.BOX,
      [VehicleTypes.SEDAN]: BodyTypeEnum.PASSENGER,
      [VehicleTypes.HATCHBACK]: BodyTypeEnum.PASSENGER,
      [VehicleTypes.COUPE]: BodyTypeEnum.PASSENGER,
      [VehicleTypes.CONVERTIBLE]: BodyTypeEnum.PASSENGER,
      [VehicleTypes.TWOWHEELER]: BodyTypeEnum.PASSENGER,
      [VehicleTypes.MUV]: BodyTypeEnum.PASSENGER,
      [VehicleTypes.COMPACT_SUV]: BodyTypeEnum.BOX,
      [VehicleTypes.SUB_COMPACT_SUV]: BodyTypeEnum.BOX,
    };
    return mapping[vehicleType] || BodyTypeEnum.FLATBED;
  }

  /**
   * Map string to CommercialVehicleTypeEnum
   */
  private mapCommercialVehicleType(
    type?: string,
  ): CommercialVehicleTypeEnum | undefined {
    if (!type) return undefined;

    const mapping: Record<string, CommercialVehicleTypeEnum> = {
      truck: CommercialVehicleTypeEnum.TRUCK,
      van: CommercialVehicleTypeEnum.VAN,
      bus: CommercialVehicleTypeEnum.BUS,
      tractor: CommercialVehicleTypeEnum.TRACTOR,
      trailer: CommercialVehicleTypeEnum.TRAILER,
      forklift: CommercialVehicleTypeEnum.FORKLIFT,
    };
    return mapping[type.toLowerCase()];
  }

  /**
   * Map string to BodyTypeEnum
   */
  private mapBodyType(type?: string): BodyTypeEnum | undefined {
    if (!type) return undefined;

    const mapping: Record<string, BodyTypeEnum> = {
      flatbed: BodyTypeEnum.FLATBED,
      container: BodyTypeEnum.CONTAINER,
      refrigerated: BodyTypeEnum.REFRIGERATED,
      tanker: BodyTypeEnum.TANKER,
      dump: BodyTypeEnum.DUMP,
      pickup: BodyTypeEnum.PICKUP,
      box: BodyTypeEnum.BOX,
      passenger: BodyTypeEnum.PASSENGER,
    };
    return mapping[type.toLowerCase()];
  }

  /**
   * Get default payload capacity based on vehicle type
   */
  private getDefaultPayloadCapacity(vehicleType: VehicleTypes): number {
    const defaults: Record<VehicleTypes, number> = {
      [VehicleTypes.TRUCK]: 5000,
      [VehicleTypes.SUV]: 1000,
      [VehicleTypes.SEDAN]: 500,
      [VehicleTypes.HATCHBACK]: 400,
      [VehicleTypes.COUPE]: 300,
      [VehicleTypes.CONVERTIBLE]: 300,
      [VehicleTypes.TWOWHEELER]: 150,
      [VehicleTypes.MUV]: 800,
      [VehicleTypes.COMPACT_SUV]: 800,
      [VehicleTypes.SUB_COMPACT_SUV]: 600,
    };
    return defaults[vehicleType] || 1000;
  }

  /**
   * Get default axle count based on vehicle type
   */
  private getDefaultAxleCount(vehicleType: VehicleTypes): number {
    const defaults: Record<VehicleTypes, number> = {
      [VehicleTypes.TRUCK]: 2,
      [VehicleTypes.SUV]: 2,
      [VehicleTypes.SEDAN]: 2,
      [VehicleTypes.HATCHBACK]: 2,
      [VehicleTypes.COUPE]: 2,
      [VehicleTypes.CONVERTIBLE]: 2,
      [VehicleTypes.TWOWHEELER]: 1,
      [VehicleTypes.MUV]: 2,
      [VehicleTypes.COMPACT_SUV]: 2,
      [VehicleTypes.SUB_COMPACT_SUV]: 2,
    };
    return defaults[vehicleType] || 2;
  }

  /**
   * Get default seating capacity based on vehicle type
   */
  private getDefaultSeatingCapacity(vehicleType: VehicleTypes): number {
    const defaults: Record<VehicleTypes, number> = {
      [VehicleTypes.TRUCK]: 3,
      [VehicleTypes.SUV]: 7,
      [VehicleTypes.SEDAN]: 5,
      [VehicleTypes.HATCHBACK]: 5,
      [VehicleTypes.COUPE]: 4,
      [VehicleTypes.CONVERTIBLE]: 4,
      [VehicleTypes.TWOWHEELER]: 2,
      [VehicleTypes.MUV]: 8,
      [VehicleTypes.COMPACT_SUV]: 5,
      [VehicleTypes.SUB_COMPACT_SUV]: 5,
    };
    return defaults[vehicleType] || 5;
  }
}
