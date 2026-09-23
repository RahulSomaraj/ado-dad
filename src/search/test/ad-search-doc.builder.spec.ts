import {
  SEARCH_DOC_VERSION,
  composeSearchDoc,
  emptyInventoryNames,
  searchDocFields,
  searchDocToUpdate,
} from '../services/ad-search-doc.builder';
import { SearchKey } from '../planner/search-plan';
import { FIXTURE_IDS as F } from './lexicon.stub';

describe('composeSearchDoc', () => {
  const names = emptyInventoryNames();
  names.manufacturers.set(F.HYUNDAI, { name: 'Hyundai', displayName: 'Hyundai' });
  names.manufacturers.set(F.TATA, { name: 'Tata Motors', displayName: 'Tata' });
  names.models.set(F.CRETA, { name: 'Creta', displayName: 'Creta' });
  names.models.set(F.ACE, { name: 'Ace', displayName: 'Ace' });
  names.variants.set(F.CRETA_SX, { name: 'SX', displayName: 'SX (O)' });
  names.fuelTypes.set(F.PETROL, { name: 'Petrol' });
  names.transmissions.set(F.MANUAL, { name: 'Manual' });
  const now = new Date('2026-09-22T00:00:00Z');

  it('builds the vehicle document the audit describes', () => {
    const doc = composeSearchDoc(
      {
        category: 'private_vehicle',
        images: ['a.jpg', 'b.jpg'],
        location: 'Kollam, Kerala',
        city: 'Kollam',
        district: 'Kollam',
        state: 'Kerala',
        vehicle: {
          manufacturerId: F.HYUNDAI,
          modelId: F.CRETA,
          variantId: F.CRETA_SX,
          fuelTypeId: F.PETROL,
          transmissionTypeId: F.MANUAL,
          year: 2022,
          color: 'White',
        },
      },
      names,
      { sellerVerified: true, now },
    );
    expect(doc.searchText).toBe('hyundai creta sx o petrol manual 2022 white kollam kerala');
    expect(doc.searchKeys).toEqual([
      SearchKey.category('private_vehicle'),
      SearchKey.manufacturer(F.HYUNDAI),
      SearchKey.model(F.CRETA),
      SearchKey.variant(F.CRETA_SX),
      SearchKey.fuel(F.PETROL),
      SearchKey.transmission(F.MANUAL),
      SearchKey.district('kollam'),
    ]);
    expect(doc.vehicleYear).toBe(2022);
    expect(doc.bedrooms).toBeUndefined();
    expect(doc.imageCount).toBe(2);
    expect(doc.sellerVerified).toBe(true);
    expect(doc.searchDocVersion).toBe(SEARCH_DOC_VERSION);
    expect(doc.searchDocBuiltAt).toBe(now);
  });

  it('adds brand aliases so "tata" finds a Tata Motors ad', () => {
    const doc = composeSearchDoc(
      {
        category: 'commercial_vehicle',
        commercial: { manufacturerId: F.TATA, modelId: F.ACE, commercialVehicleType: 'mini_truck', year: 2019 },
      },
      names,
      { now },
    );
    expect(doc.searchText.split(' ')).toEqual(
      expect.arrayContaining(['tata', 'motors', 'ace', 'mini', 'truck', '2019']),
    );
    expect(doc.searchKeys).toContain(SearchKey.commercialVehicleType('mini_truck'));
    expect(doc.searchKeys).toContain(SearchKey.category('commercial_vehicle'));
  });

  it('builds the property document with BHK spellings and boolean keys', () => {
    const doc = composeSearchDoc(
      {
        category: 'property',
        images: [],
        city: 'Kochi',
        district: 'Ernakulam',
        property: {
          propertyType: 'apartment',
          listingType: 'rent',
          bedrooms: 2,
          areaSqft: 950,
          isFurnished: true,
          hasParking: false,
        },
      },
      names,
      { now },
    );
    expect(doc.searchText).toBe('apartment rent for 2bhk 2 bhk furnished kochi ernakulam');
    expect(doc.searchKeys).toEqual([
      SearchKey.category('property'),
      SearchKey.propertyType('apartment'),
      SearchKey.listingType('rent'),
      SearchKey.furnished(),
      SearchKey.district('ernakulam'),
    ]);
    expect(doc.bedrooms).toBe(2);
    expect(doc.areaSqft).toBe(950);
    expect(doc.vehicleYear).toBeUndefined();
    expect(doc.imageCount).toBe(0);
    expect(doc.sellerVerified).toBe(false);
  });

  it('tolerates unknown catalogue ids (keys still written, no names)', () => {
    const doc = composeSearchDoc(
      { category: 'two_wheeler', vehicle: { manufacturerId: '65b0000000000000000000ff', modelId: '65b0000000000000000000fe' } },
      names,
      { now },
    );
    expect(doc.searchKeys).toContain(SearchKey.manufacturer('65b0000000000000000000ff'));
    expect(doc.searchText).toBe('');
  });

  it('is deterministic for the same input', () => {
    const input = {
      category: 'private_vehicle',
      vehicle: { manufacturerId: F.HYUNDAI, modelId: F.CRETA, year: 2020 },
      district: 'Kollam',
    };
    const a = composeSearchDoc(input, names, { now });
    const b = composeSearchDoc(input, names, { now });
    expect(a).toEqual(b);
  });

  it('produces matching insert and update shapes', () => {
    const doc = composeSearchDoc({ category: 'property', property: { propertyType: 'plot' } }, names, { now });
    const fields = searchDocFields(doc);
    expect(fields.vehicleYear).toBeUndefined();
    expect('vehicleYear' in fields).toBe(false);
    const upd = searchDocToUpdate(doc);
    expect(upd.$unset).toEqual({ vehicleYear: '', bedrooms: '', areaSqft: '' });
    expect(upd.$set.searchKeys).toEqual(doc.searchKeys);
  });
});
