import { CreateAdV2Dto, AdCategoryV2 } from '../dto/create-ad-v2.dto';

export function mapToDetailedResponseDto(ad: any) {
  return {
    id: ad._id?.toString(),
    title: ad.title,
    description: ad.description,
    price: ad.price,
    images: ad.images ?? [],
    location: ad.location,
    category: ad.category,
    isActive: ad.isActive ?? true,
    soldOut: ad.soldOut ?? false,
    status: ad.status ?? 'active',
    postedAt: ad.createdAt,
    updatedAt: ad.updatedAt,
    postedBy: ad.postedBy?.toString(),
    user: ad.user
      ? {
          id: ad.user._id?.toString(),
          name: ad.user.name,
          email: ad.user.email,
          phone: ad.user.phone,
        }
      : undefined,
    propertyDetails: ad.propertyDetails?.[0]
      ? {
          propertyType: ad.propertyDetails[0].propertyType,
          bedrooms: ad.propertyDetails[0].bedrooms,
          bathrooms: ad.propertyDetails[0].bathrooms,
          areaSqft: ad.propertyDetails[0].areaSqft,
          floor: ad.propertyDetails[0].floor,
          isFurnished: ad.propertyDetails[0].isFurnished,
          hasParking: ad.propertyDetails[0].hasParking,
          hasGarden: ad.propertyDetails[0].hasGarden,
          amenities: ad.propertyDetails[0].amenities ?? [],
        }
      : undefined,
    vehicleDetails: ad.vehicleDetails?.[0]
      ? {
          vehicleType: ad.vehicleDetails[0].vehicleType,
          manufacturerId: ad.vehicleDetails[0].manufacturerId?.toString(),
          modelId: ad.vehicleDetails[0].modelId?.toString(),
          variantId: ad.vehicleDetails[0].variantId?.toString(),
          year: ad.vehicleDetails[0].year,
          mileage: ad.vehicleDetails[0].mileage,
          transmissionTypeId:
            ad.vehicleDetails[0].transmissionTypeId?.toString(),
          fuelTypeId: ad.vehicleDetails[0].fuelTypeId?.toString(),
          color: ad.vehicleDetails[0].color,
          isFirstOwner: ad.vehicleDetails[0].isFirstOwner,
          hasInsurance: ad.vehicleDetails[0].hasInsurance,
          hasRcBook: ad.vehicleDetails[0].hasRcBook,
          additionalFeatures: ad.vehicleDetails[0].additionalFeatures ?? [],
          inventory: ad.vehicleDetails[0].inventory
            ? {
                manufacturer: ad.vehicleDetails[0].inventory.manufacturer,
                model: ad.vehicleDetails[0].inventory.model,
                variant: ad.vehicleDetails[0].inventory.variant,
                transmissionType:
                  ad.vehicleDetails[0].inventory.transmissionType,
                fuelType: ad.vehicleDetails[0].inventory.fuelType,
              }
            : undefined,
        }
      : undefined,
    commercialVehicleDetails: ad.commercialVehicleDetails?.[0]
      ? {
          vehicleType: ad.commercialVehicleDetails[0].vehicleType,
          commercialVehicleType:
            ad.commercialVehicleDetails[0].commercialVehicleType,
          bodyType: ad.commercialVehicleDetails[0].bodyType,
          manufacturerId:
            ad.commercialVehicleDetails[0].manufacturerId?.toString(),
          modelId: ad.commercialVehicleDetails[0].modelId?.toString(),
          variantId: ad.commercialVehicleDetails[0].variantId?.toString(),
          year: ad.commercialVehicleDetails[0].year,
          mileage: ad.commercialVehicleDetails[0].mileage,
          payloadCapacity: ad.commercialVehicleDetails[0].payloadCapacity,
          payloadUnit: ad.commercialVehicleDetails[0].payloadUnit,
          axleCount: ad.commercialVehicleDetails[0].axleCount,
          transmissionTypeId:
            ad.commercialVehicleDetails[0].transmissionTypeId?.toString(),
          fuelTypeId: ad.commercialVehicleDetails[0].fuelTypeId?.toString(),
          color: ad.commercialVehicleDetails[0].color,
          hasInsurance: ad.commercialVehicleDetails[0].hasInsurance,
          hasFitness: ad.commercialVehicleDetails[0].hasFitness,
          hasPermit: ad.commercialVehicleDetails[0].hasPermit,
          additionalFeatures:
            ad.commercialVehicleDetails[0].additionalFeatures ?? [],
          seatingCapacity: ad.commercialVehicleDetails[0].seatingCapacity,
          inventory: ad.commercialVehicleDetails[0].inventory
            ? {
                manufacturer:
                  ad.commercialVehicleDetails[0].inventory.manufacturer,
                model: ad.commercialVehicleDetails[0].inventory.model,
                variant: ad.commercialVehicleDetails[0].inventory.variant,
                transmissionType:
                  ad.commercialVehicleDetails[0].inventory.transmissionType,
                fuelType: ad.commercialVehicleDetails[0].inventory.fuelType,
              }
            : undefined,
        }
      : undefined,
    favoritesCount: ad.favoritesCount ?? 0,
    isFavorited: ad.isFavorited ?? false,
    chatsCount: ad.chatsCount ?? 0,
    averageRating: ad.averageRating,
    ratingsCount: ad.ratingsCount,
  };
}

export async function buildTitle(
  dto: CreateAdV2Dto,
  inventory: { getModelName: (id: string) => Promise<string | undefined> },
): Promise<string> {
  if (dto.category === AdCategoryV2.PROPERTY) {
    // For property, use a simple title based on property type and location
    const propertyType = dto.property?.propertyType || 'Property';
    const bedrooms = dto.property?.bedrooms || '';
    const location = dto.data.location.split(',')[0]; // Get first part of location
    return `${bedrooms ? bedrooms + 'BHK ' : ''}${propertyType} in ${location}`.trim();
  }

  // For vehicles, get model name from inventory
  const veh =
    dto.category === AdCategoryV2.COMMERCIAL_VEHICLE
      ? dto.commercial!
      : dto.vehicle!;
  const modelName = (await inventory.getModelName(veh.modelId)) ?? 'Vehicle';
  const year = veh.year || '';
  const color = veh.color || '';

  let title = `${modelName}`;
  if (year) title += ` ${year}`;
  if (color) title += ` (${color})`;

  return title.trim();
}

export function mapToBasicResponseDto(ad: any) {
  return {
    id: ad._id?.toString(),
    title: ad.title,
    description: ad.description,
    price: ad.price,
    images: ad.images ?? [],
    location: ad.location,
    category: ad.category,
    isActive: ad.isActive ?? true,
    soldOut: ad.soldOut ?? false,
    status: ad.status ?? 'active',
    postedAt: ad.createdAt,
    updatedAt: ad.updatedAt,
    postedBy: ad.postedBy?.toString(),
    user: ad.user
      ? {
          id: ad.user._id?.toString(),
          name: ad.user.name,
          email: ad.user.email,
          phone: ad.user.phone,
        }
      : undefined,
  };
}
