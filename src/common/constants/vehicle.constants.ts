/**
 * Shared constants for vehicle-related validations
 * Centralized to avoid duplication and ensure consistency
 */

// Valid fuel type values
export const VALID_FUEL_TYPES = [
  'biodiesel',
  'cng',
  'diesel',
  'electric',
  'ethanol',
  'hybrid_diesel',
  'hybrid_petrol',
  'hydrogen',
  'kerosene',
  'lpg',
  'methanol',
  'petrol',
  'plug_in_hybrid',
  'premium_diesel',
  'premium_petrol',
  'racing_petrol',
  'super_petrol',
] as const;

// Valid transmission type values
export const VALID_TRANSMISSION_TYPES = [
  'automated_manual',
  'automatic_10',
  'automatic_4',
  'automatic_5',
  'automatic_6',
  'automatic_8',
  'automatic_9',
  'cvt',
  'cvt_sport',
  'dct_6',
  'dct_7',
  'dct_8',
  'manual_5',
  'manual_6',
  'manual_7',
  'semi_auto_5',
  'semi_auto_6',
  'sequential',
  'single_speed',
  'two_speed',
] as const;

// Valid vehicle type values
export const VALID_VEHICLE_TYPES = [
  'SUV',
  'Sedan',
  'Truck',
  'Coupe',
  'Hatchback',
  'Convertible',
  'two-wheeler',
  'MUV',
  'Compact SUV',
  'Sub-Compact SUV',
] as const;

// Valid feature package values
export const VALID_FEATURE_PACKAGES = [
  'Base',
  'L',
  'LX',
  'V',
  'VX',
  'Z',
  'ZX',
  'ZX(O)',
  'ZX+',
  'Top End',
  'Premium',
  'Executive',
  'Royale',
] as const;

// Type exports for better type safety
export type FuelType = typeof VALID_FUEL_TYPES[number];
export type TransmissionType = typeof VALID_TRANSMISSION_TYPES[number];
export type VehicleType = typeof VALID_VEHICLE_TYPES[number];
export type FeaturePackage = typeof VALID_FEATURE_PACKAGES[number];

