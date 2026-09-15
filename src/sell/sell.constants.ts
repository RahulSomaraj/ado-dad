/**
 * Sell-flow reference data and limits (SELL_API_CONTRACT v1, 15 Sep 2026).
 *
 * Single source of truth for GET /v2/sell/config, the v2 create validator and
 * the media intent checks, so the three can never disagree again.
 * Plain constants only — safe to import from any module without DI cycles.
 */

export const SELL_CONFIG_VERSION = '2026-09-15.1';

export type SellCategory =
  | 'private_vehicle'
  | 'two_wheeler'
  | 'commercial_vehicle'
  | 'property';

export const SELL_CATEGORIES: SellCategory[] = [
  'private_vehicle',
  'two_wheeler',
  'commercial_vehicle',
  'property',
];

export const MB = 1024 * 1024;

export const MEDIA_LIMITS = {
  ad_image: {
    maxBytes: 10 * MB,
    contentTypes: {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    } as Record<string, string>,
  },
  ad_video: {
    maxBytes: 50 * MB,
    contentTypes: {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
    } as Record<string, string>,
  },
} as const;

export type MediaKind = keyof typeof MEDIA_LIMITS;

export const MEDIA_PRESIGN_TTL_SECONDS = 900;

/** Yearly ceiling moves with the calendar: next model year is allowed. */
export function sellYearMax(now: Date = new Date()): number {
  return now.getFullYear() + 1;
}

export function sellLimits(category: SellCategory, now: Date = new Date()) {
  return {
    minPhotos: 1,
    recommendedPhotos: 5,
    maxPhotos: category === 'two_wheeler' ? 15 : 20,
    maxImageBytes: MEDIA_LIMITS.ad_image.maxBytes,
    maxVideoBytes: MEDIA_LIMITS.ad_video.maxBytes,
    maxVideoSeconds: 60,
    titleMin: 10,
    titleMax: 70,
    descriptionMin: 20,
    descriptionMax: 4000,
    priceMin: 1,
    priceMax: 1_000_000_000,
    yearMin: 1990,
    yearMax: sellYearMax(now),
    mileageMax: 999_999,
  };
}

/** Absolute server ceiling on photos per ad, whatever the category. */
export const MAX_PHOTOS_ANY_CATEGORY = 20;

export const PROPERTY_TYPES: {
  value: string;
  label: string;
  residential: boolean;
}[] = [
  { value: 'apartment', label: 'Apartment', residential: true },
  { value: 'house', label: 'House', residential: true },
  { value: 'villa', label: 'Villa', residential: true },
  { value: 'plot', label: 'Plot', residential: false },
  { value: 'commercial', label: 'Commercial', residential: false },
  { value: 'office', label: 'Office', residential: false },
  { value: 'shop', label: 'Shop', residential: false },
  { value: 'warehouse', label: 'Warehouse', residential: false },
];

export const RESIDENTIAL_PROPERTY_TYPES = new Set(
  PROPERTY_TYPES.filter((p) => p.residential).map((p) => p.value),
);

export const FURNISHING_VALUES = ['unfurnished', 'semi', 'full'] as const;
export const LISTING_TYPES = ['sell', 'rent'] as const;
export const PAYLOAD_UNITS = ['kg', 'tonne'] as const;

/** Labels for BodyTypeEnum (commercial-vehicle-ad.schema.ts). */
export const BODY_TYPE_LABELS: Record<string, string> = {
  flatbed: 'Flatbed',
  container: 'Container',
  refrigerated: 'Refrigerated',
  tanker: 'Tanker',
  dump: 'Dump',
  pickup: 'Pickup',
  box: 'Box',
  passenger: 'Passenger',
};

export const SELL_FEATURES: Record<SellCategory, string[]> = {
  private_vehicle: [
    'Sunroof',
    'Reverse camera',
    'Touchscreen',
    'Bluetooth',
    'Alloy wheels',
    'Airbags',
    'ABS',
    'Cruise control',
    'Keyless entry',
    'Leather seats',
  ],
  two_wheeler: [
    'ABS',
    'Disc brakes',
    'Alloy wheels',
    'Digital console',
    'USB charging',
    'Self start',
  ],
  commercial_vehicle: [
    'Power steering',
    'AC cabin',
    'GPS tracker',
    'Music system',
  ],
  property: [
    'Lift',
    'Power backup',
    'Security',
    'Covered parking',
    'Well water',
    'Municipal water',
    'Gym',
    'Swimming pool',
    'Garden',
    'Vastu compliant',
  ],
};

export const SELL_SHOT_LISTS: Record<SellCategory, string[]> = {
  private_vehicle: ['Front', 'Rear', 'Side', 'Interior', 'Odometer'],
  two_wheeler: ['Left side', 'Right side', 'Front', 'Odometer', 'Tyres'],
  commercial_vehicle: ['Front', 'Rear', 'Side', 'Cabin', 'Odometer'],
  property: ['Exterior', 'Hall', 'Kitchen', 'Bedroom', 'Bathroom'],
};

export const SELL_COLORS: { value: string; label: string; hex: string }[] = [
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'silver', label: 'Silver', hex: '#C0C4CC' },
  { value: 'grey', label: 'Grey', hex: '#8A8F98' },
  { value: 'black', label: 'Black', hex: '#1B1B1B' },
  { value: 'red', label: 'Red', hex: '#C62828' },
  { value: 'blue', label: 'Blue', hex: '#1E4DB7' },
  { value: 'brown', label: 'Brown', hex: '#7A5A3A' },
  { value: 'green', label: 'Green', hex: '#2E7D32' },
  { value: 'yellow', label: 'Yellow', hex: '#F2B705' },
  { value: 'orange', label: 'Orange', hex: '#E8660D' },
];

/**
 * Value the app sends as `?category=` to GET /vehicle-inventory/manufacturers
 * (FilterManufacturerDto.category → Manufacturer.vehicleCategory). null = n/a.
 */
export const MANUFACTURER_CATEGORY: Record<SellCategory, string | null> = {
  private_vehicle: 'passenger_car',
  two_wheeler: 'two_wheeler',
  commercial_vehicle: 'commercial_vehicle',
  property: null,
};

/**
 * Category used to filter fuel/transmission types. Mirrors the app's
 * `appliesTo(<category>)`: a type with no `vehicleCategory` applies to all.
 */
export const INVENTORY_TYPE_CATEGORY: Record<SellCategory, string | null> = {
  private_vehicle: 'passenger_car',
  two_wheeler: 'two_wheeler',
  commercial_vehicle: 'commercial_vehicle',
  property: null,
};
