import { Injectable, BadRequestException } from '@nestjs/common';
import { VehicleInventoryService } from '../../../vehicle-inventory/vehicle-inventory.service';

@Injectable()
export class VehicleInventoryGateway {
  constructor(private readonly inventory: VehicleInventoryService) {}

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
      const manufacturer =
        await this.inventory.findManufacturerById(manufacturerId);
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
      const model = await this.inventory.findVehicleModelById(modelId);
      return (
        model || { _id: modelId, name: 'Not Found', displayName: 'Not Found' }
      );
    } catch (error) {
      return { _id: modelId, name: 'Not Found', displayName: 'Not Found' };
    }
  }

  async getVariant(variantId: string): Promise<any> {
    try {
      const variant = await this.inventory.findVehicleVariantById(variantId);
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
      const transmission =
        await this.inventory.findTransmissionTypeById(transmissionId);
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
      const fuelType = await this.inventory.findFuelTypeById(fuelTypeId);
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
    if (!ids || ids.length === 0) return [];
    return this.inventory.findManufacturersByIds(ids);
  }

  async getModelsByIds(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];
    return this.inventory.findVehicleModelsByIds(ids);
  }

  async getVariantsByIds(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];
    return this.inventory.findVehicleVariantsByIds(ids);
  }

  async getFuelTypesByIds(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];
    return this.inventory.findFuelTypesByIds(ids);
  }

  async getTransmissionTypesByIds(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];
    return this.inventory.findTransmissionTypesByIds(ids);
  }
}
