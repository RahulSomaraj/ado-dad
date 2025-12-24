/**
 * Field type mappings for CSV parsing
 * Maps field names to their expected data types
 */

export const VEHICLE_COMPANY_FIELD_TYPES = {
  name: 'string',
  displayName: 'string',
  originCountry: 'string',
  description: 'string',
  logo: 'string',
  website: 'string',
  foundedYear: 'number',
  headquarters: 'string',
  isActive: 'boolean',
  isPremium: 'boolean',
} as const;

export const VEHICLE_MODEL_FIELD_TYPES = {
  name: 'string',
  displayName: 'string',
  vehicleType: 'string',
  description: 'string',
  launchYear: 'number',
  segment: 'string',
  bodyType: 'string',
  images: 'array',
  brochureUrl: 'string',
  isCommercialVehicle: 'boolean',
  commercialVehicleType: 'string',
  commercialBodyType: 'string',
  defaultPayloadCapacity: 'number',
  defaultAxleCount: 'number',
  defaultPayloadUnit: 'string',
  defaultSeatingCapacity: 'number',
  fuelTypes: 'array',
  transmissionTypes: 'array',
  isActive: 'boolean',
  manufacturerId: 'string', // Will be validated as ObjectId
} as const;

export const VEHICLE_VARIANT_FIELD_TYPES = {
  name: 'string',
  displayName: 'string',
  fuelType: 'string',
  transmissionType: 'string',
  featurePackage: 'string',
  modelId: 'string', // Will be validated as ObjectId
  engine_capacity: 'number',
  engine_maxPower: 'string',
  engine_maxTorque: 'string',
  engine_cylinders: 'number',
  engine_turbo: 'boolean',
  perf_mileage: 'string',
  perf_acceleration: 'string',
  perf_topSpeed: 'string',
  perf_fuelCapacity: 'number',
  dim_length: 'number',
  dim_width: 'number',
  dim_height: 'number',
  dim_wheelbase: 'number',
  dim_groundClearance: 'number',
  dim_bootSpace: 'number',
  seatingCapacity: 'number',
  price: 'number',
  exShowroomPrice: 'number',
  onRoadPrice: 'number',
  colors: 'array',
  images: 'array',
  description: 'string',
  brochureUrl: 'string',
  videoUrl: 'string',
  featuresJson: 'object',
  isActive: 'boolean',
  isLaunched: 'boolean',
  launchDate: 'date',
} as const;

