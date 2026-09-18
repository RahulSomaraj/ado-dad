import { SearchTermType } from '../schemas/search-term.schema';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';
import { PropertyTypeEnum, AdListingType } from '../../ads/schemas/property-ad.schema';

/**
 * Hand-curated lexicon. This is the source of truth for the `source: 'seed'`
 * rows in `search_terms`; brands, models, variants, fuels and transmissions are
 * NOT here — they are materialized from vehicle-inventory (see
 * inventory-lexicon.materializer.ts) so a new model in the catalogue becomes
 * searchable without a deploy.
 *
 * Every phrase is normalized through `normalizePhrase()` at seed time, so entries
 * may be written naturally ("second hand car", "2 wheeler").
 */
export interface SeedTerm {
  terms: string[];
  type: SearchTermType;
  payload: Record<string, unknown>;
  weight?: number;
}

/**
 * Category synonyms — the entries that fix the reported bug. Weight 100 means a
 * category word always beats a coincidental brand or free-text match, so "cars"
 * can never be satisfied by a flat ad that mentions "car parking".
 */
export const CATEGORY_TERMS: SeedTerm[] = [
  {
    type: SearchTermType.CATEGORY,
    payload: { category: AdCategoryV2.PRIVATE_VEHICLE, label: 'Cars' },
    terms: [
      'car', 'cars', 'kar', 'carr', 'caar',
      'used car', 'used cars', 'second hand car', 'second hand cars',
      'secondhand car', 'old car', 'old cars',
      'four wheeler', 'four wheelers', '4 wheeler', '4 wheelers', 'fourwheeler',
      'sedan', 'sedans', 'hatchback', 'hatchbacks', 'suv', 'suvs', 'muv',
    ],
  },
  {
    type: SearchTermType.CATEGORY,
    payload: { category: AdCategoryV2.TWO_WHEELER, label: 'Bikes' },
    terms: [
      'bike', 'bikes', 'byke', 'bykes', 'bikeu',
      'two wheeler', 'two wheelers', '2 wheeler', '2 wheelers', 'twowheeler',
      'motorcycle', 'motor cycle', 'motorbike', 'motor bike',
      'scooter', 'scooters', 'scooty', 'scootie', 'scooty pep',
      'moped', 'mopeds', 'used bike', 'used bikes', 'second hand bike',
    ],
  },
  {
    type: SearchTermType.CATEGORY,
    payload: { category: AdCategoryV2.COMMERCIAL_VEHICLE, label: 'Commercial Vehicles' },
    terms: [
      'commercial vehicle', 'commercial vehicles', 'goods vehicle',
      'transport vehicle', 'heavy vehicle', 'heavy vehicles',
    ],
  },
  {
    type: SearchTermType.CATEGORY,
    payload: { category: AdCategoryV2.PROPERTY, label: 'Property' },
    terms: [
      'property', 'properties', 'real estate', 'realestate',
      'building', 'buildings',
    ],
  },
];

/**
 * Commercial vehicle body/type words. They imply the commercial_vehicle category
 * AND narrow `commercialVehicleTypes`. The values must match the strings stored
 * on `CommercialVehicleAd.commercialVehicleType`, which is a free string backed
 * by the sell-config collection — the seeder validates them against
 * SellConfigService at startup and logs any that no longer exist.
 */
export const CV_TYPE_TERMS: SeedTerm[] = [
  { type: SearchTermType.CV_TYPE, payload: { category: AdCategoryV2.COMMERCIAL_VEHICLE, commercialVehicleType: 'truck', label: 'Trucks' },
    terms: ['truck', 'trucks', 'lorry', 'lorries', 'tipper', 'tippers', 'mini truck', 'mini lorry'] },
  { type: SearchTermType.CV_TYPE, payload: { category: AdCategoryV2.COMMERCIAL_VEHICLE, commercialVehicleType: 'van', label: 'Vans' },
    terms: ['van', 'vans', 'tempo', 'tempo traveller', 'pickup', 'pick up', 'pickup van'] },
  { type: SearchTermType.CV_TYPE, payload: { category: AdCategoryV2.COMMERCIAL_VEHICLE, commercialVehicleType: 'bus', label: 'Buses' },
    terms: ['bus', 'buses', 'minibus', 'mini bus'] },
  { type: SearchTermType.CV_TYPE, payload: { category: AdCategoryV2.COMMERCIAL_VEHICLE, commercialVehicleType: 'auto_rickshaw', label: 'Auto Rickshaws' },
    terms: ['auto', 'autos', 'auto rickshaw', 'autorickshaw', 'three wheeler', '3 wheeler', 'tuk tuk'] },
];

/**
 * Property type words. Each implies `category=property` and one propertyType.
 * "house" and "home" are deliberately separate from the generic "property" term
 * so "house in kollam" narrows to houses rather than every listing.
 */
export const PROPERTY_TYPE_TERMS: SeedTerm[] = [
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.APARTMENT, label: 'Apartments' },
    terms: ['flat', 'flats', 'apartment', 'apartments', 'appartment', 'appartments'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.HOUSE, label: 'Houses' },
    terms: ['house', 'houses', 'home', 'homes', 'independent house'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.VILLA, label: 'Villas' },
    terms: ['villa', 'villas'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.PLOT, label: 'Plots & Land' },
    terms: ['plot', 'plots', 'land', 'lands', 'site', 'sites', 'cent', 'cents', 'acre', 'acres'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.SHOP, label: 'Shops' },
    terms: ['shop', 'shops', 'showroom space', 'shop room'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.OFFICE, label: 'Offices' },
    terms: ['office', 'offices', 'office space'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.WAREHOUSE, label: 'Warehouses' },
    terms: ['warehouse', 'warehouses', 'godown', 'godowns'] },
  { type: SearchTermType.PROPERTY_TYPE, payload: { category: AdCategoryV2.PROPERTY, propertyType: PropertyTypeEnum.COMMERCIAL, label: 'Commercial Property' },
    terms: ['commercial property', 'commercial building', 'commercial space'] },
];

/**
 * Rent vs sale. Note "sale" alone is a stop word (too often noise in a title);
 * only the multi-word forms and unambiguous singles are listed.
 */
export const LISTING_TYPE_TERMS: SeedTerm[] = [
  { type: SearchTermType.LISTING_TYPE, payload: { listingType: AdListingType.RENT, label: 'For Rent' },
    terms: ['rent', 'rental', 'rentals', 'for rent', 'on rent', 'to let', 'lease', 'monthly rent'] },
  { type: SearchTermType.LISTING_TYPE, payload: { listingType: AdListingType.SELL, label: 'For Sale' },
    terms: ['for sale', 'resale', 'to sell', 'selling'] },
];

/**
 * Terms that are BOTH a category hint and a model hint. The model half is filled
 * in by the materializer when it finds a matching catalogue entry; the category
 * half is always safe, so "bullet" at minimum lands the user in two-wheelers.
 */
export const DUAL_HINT_TERMS: SeedTerm[] = [
  { type: SearchTermType.CATEGORY, weight: 70,
    payload: { category: AdCategoryV2.TWO_WHEELER, label: 'Bikes' },
    terms: ['bullet', 'activa', 'pulsar', 'splendor', 'jupiter', 'dio', 'access', 'apache', 'fz', 'r15', 'classic 350'] },
  { type: SearchTermType.CATEGORY, weight: 70,
    payload: { category: AdCategoryV2.PRIVATE_VEHICLE, label: 'Cars' },
    terms: ['swift', 'alto', 'i20', 'i10', 'creta', 'baleno', 'wagonr', 'wagon r', 'innova', 'fortuner', 'ertiga', 'dzire', 'xuv', 'thar', 'nexon'] },
];

export const ALL_SEED_TERMS: SeedTerm[] = [
  ...CATEGORY_TERMS,
  ...CV_TYPE_TERMS,
  ...PROPERTY_TYPE_TERMS,
  ...LISTING_TYPE_TERMS,
  ...DUAL_HINT_TERMS,
];
