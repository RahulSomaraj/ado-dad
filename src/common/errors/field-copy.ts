/**
 * User-facing copy for sell-flow fields. Keys are request paths with the
 * section prefix removed where the copy is shared (`vehicle.color` and
 * `commercial.color` both use `color`).
 */
const COPY: Record<string, string> = {
  category: 'Choose a category',
  'data.title': 'Title must be 10 to 70 characters',
  'data.description': 'Description must be 20 to 4000 characters',
  'data.price': 'Enter a price above ₹0',
  'data.location': 'Choose a location',
  'data.latitude': 'Choose a location',
  'data.longitude': 'Choose a location',
  'data.mediaIds': 'Add at least one photo',
  'data.videoMediaId': 'Video could not be attached. Upload it again',
  'data.images': 'Photos must be uploaded through the app',
  'data.link': 'Enter a valid link',
  vehicleType: 'Choose the vehicle type',
  manufacturerId: 'Choose a brand',
  modelId: 'Choose a model',
  variantId: 'Choose a valid variant',
  year: 'Choose a valid year',
  mileage: 'Enter kilometres driven (0 or more)',
  transmissionTypeId: 'Choose a transmission',
  fuelTypeId: 'Choose a fuel type',
  color: 'Choose a colour',
  ownerCount: 'Owners must be between 1 and 10',
  additionalFeatures: 'Choose features from the list',
  commercialVehicleType: 'Choose a vehicle type',
  bodyType: 'Choose a valid body type',
  payloadCapacity: 'Enter a valid payload',
  payloadUnit: 'Choose kg or tonne',
  axleCount: 'Axles must be between 1 and 10',
  seatingCapacity: 'Enter valid seating capacity',
  listingType: 'Choose sell or rent',
  propertyType: 'Choose a property type',
  bedrooms: 'Enter the number of bedrooms',
  bathrooms: 'Enter the number of bathrooms',
  areaSqft: 'Enter the built-up area',
  landAreaSqft: 'Enter a valid land area',
  floor: 'Enter a valid floor',
  furnishing: 'Choose furnishing',
  amenities: 'Choose amenities from the list',
  kind: 'Choose image or video',
  contentType: 'Unsupported file type',
  size: 'Enter the file size in bytes',
};

/** Copy for a request path, or undefined when there is no curated message. */
export function fieldCopy(path: string): string | undefined {
  if (COPY[path]) return COPY[path];
  const leaf = path.split('.').slice(1).join('.') || path;
  return COPY[leaf];
}
