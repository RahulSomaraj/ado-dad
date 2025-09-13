import { BadRequestException } from '@nestjs/common';
import { CreateAdV2Dto, AdCategoryV2 } from '../dto/create-ad-v2.dto';

export function validateCreateCombination(dto: CreateAdV2Dto) {
  // Common base validation
  const base = dto.data;
  if (!base?.description || base.price == null || !base.location) {
    throw new BadRequestException(
      'Description, price, and location are required for all ad types',
    );
  }

  // Validate price is positive
  if (base.price < 0) {
    throw new BadRequestException('Price must be a positive number');
  }

  // Validate images array size
  if (base.images && base.images.length > 20) {
    throw new BadRequestException('Maximum 20 images allowed');
  }

  // Category-specific validation
  switch (dto.category) {
    case AdCategoryV2.PROPERTY:
      if (!dto.property) {
        throw new BadRequestException(
          'Property data is required for property advertisements',
        );
      }
      if (dto.vehicle || dto.commercial) {
        throw new BadRequestException(
          'Only property data should be provided for property advertisements',
        );
      }
      validatePropertyData(dto.property);
      break;

    case AdCategoryV2.PRIVATE_VEHICLE:
    case AdCategoryV2.TWO_WHEELER:
      if (!dto.vehicle) {
        throw new BadRequestException(
          'Vehicle data is required for vehicle advertisements',
        );
      }
      if (dto.property || dto.commercial) {
        throw new BadRequestException(
          'Only vehicle data should be provided for vehicle advertisements',
        );
      }
      validateVehicleData(dto.vehicle);
      break;

    case AdCategoryV2.COMMERCIAL_VEHICLE:
      if (!dto.commercial) {
        throw new BadRequestException(
          'Commercial vehicle data is required for commercial vehicle advertisements',
        );
      }
      if (dto.property || dto.vehicle) {
        throw new BadRequestException(
          'Only commercial vehicle data should be provided for commercial vehicle advertisements',
        );
      }
      validateCommercialVehicleData(dto.commercial);
      break;

    default:
      throw new BadRequestException(`Invalid category: ${dto.category}`);
  }
}

function validatePropertyData(property: any) {
  if (!property.propertyType) {
    throw new BadRequestException('Property type is required');
  }

  if (property.bedrooms < 0) {
    throw new BadRequestException('Bedrooms must be a non-negative number');
  }

  if (property.bathrooms < 0) {
    throw new BadRequestException('Bathrooms must be a non-negative number');
  }

  if (property.areaSqft <= 0) {
    throw new BadRequestException('Area must be a positive number');
  }

  if (property.floor !== undefined && property.floor < 0) {
    throw new BadRequestException('Floor must be a non-negative number');
  }

  // Validate amenities array
  if (property.amenities && !Array.isArray(property.amenities)) {
    throw new BadRequestException('Amenities must be an array of strings');
  }
}

function validateVehicleData(vehicle: any) {
  if (!vehicle.vehicleType) {
    throw new BadRequestException('Vehicle type is required');
  }

  if (!vehicle.manufacturerId) {
    throw new BadRequestException('Manufacturer ID is required');
  }

  if (!vehicle.modelId) {
    throw new BadRequestException('Model ID is required');
  }

  if (vehicle.year < 1900 || vehicle.year > new Date().getFullYear() + 1) {
    throw new BadRequestException('Year must be between 1900 and next year');
  }

  if (vehicle.mileage < 0) {
    throw new BadRequestException('Mileage must be a non-negative number');
  }

  if (!vehicle.transmissionTypeId) {
    throw new BadRequestException('Transmission type ID is required');
  }

  if (!vehicle.fuelTypeId) {
    throw new BadRequestException('Fuel type ID is required');
  }

  if (!vehicle.color) {
    throw new BadRequestException('Color is required');
  }

  // Validate additional features array
  if (
    vehicle.additionalFeatures &&
    !Array.isArray(vehicle.additionalFeatures)
  ) {
    throw new BadRequestException(
      'Additional features must be an array of strings',
    );
  }
}

function validateCommercialVehicleData(commercial: any) {
  // First validate as vehicle
  validateVehicleData(commercial);

  // At least one commercial-specific field must be provided
  const hasCommercialFields =
    commercial.commercialVehicleType ||
    commercial.bodyType ||
    commercial.payloadCapacity !== undefined ||
    commercial.axleCount !== undefined ||
    commercial.seatingCapacity !== undefined;

  if (!hasCommercialFields) {
    throw new BadRequestException(
      'At least one commercial-specific field (commercialVehicleType, bodyType, payloadCapacity, axleCount, or seatingCapacity) must be provided',
    );
  }

  // Validate commercial-specific fields
  if (
    commercial.payloadCapacity !== undefined &&
    commercial.payloadCapacity < 0
  ) {
    throw new BadRequestException(
      'Payload capacity must be a non-negative number',
    );
  }

  if (commercial.axleCount !== undefined && commercial.axleCount < 0) {
    throw new BadRequestException('Axle count must be a non-negative number');
  }

  if (
    commercial.seatingCapacity !== undefined &&
    commercial.seatingCapacity < 1
  ) {
    throw new BadRequestException('Seating capacity must be at least 1');
  }
}
