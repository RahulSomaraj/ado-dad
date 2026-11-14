import {
  normalizeCreateAdV2,
  validateCreateAdV2,
} from '../domain/ad.v2.validators';
import { AdCategoryV2, CreateAdV2Dto } from '../dto/create-ad-v2.dto';

const OID = (n: number) => n.toString(16).padStart(24, 'a');
const NOW = new Date('2026-09-15T00:00:00Z');

const ctx = {
  commercialVehicleTypes: new Set([
    'truck',
    'auto_rickshaws',
    'taxi_cab',
    'modified_jeep',
    'heavy_machinery',
  ]),
  isAllowedImageUrl: (u: string) =>
    u.startsWith('https://ado-dad.s3.ap-south-1.amazonaws.com/'),
  now: NOW,
};

const baseData = () => ({
  description: 'Well maintained, single owner, full service history.',
  price: 450000,
  location: 'Kakkanad, Kochi',
  mediaIds: [OID(1), OID(2)],
});

const car = (over: Record<string, any> = {}): CreateAdV2Dto =>
  ({
    category: AdCategoryV2.PRIVATE_VEHICLE,
    data: baseData(),
    vehicle: {
      vehicleType: 'four_wheeler',
      manufacturerId: OID(10),
      modelId: OID(11),
      year: 2019,
      mileage: 42000,
      transmissionTypeId: OID(12),
      fuelTypeId: OID(13),
      color: 'White',
      ...over,
    },
  }) as any;

const run = (dto: CreateAdV2Dto) =>
  validateCreateAdV2(normalizeCreateAdV2(dto), ctx);

describe('validateCreateAdV2', () => {
  it('accepts a valid private vehicle', () => {
    expect(run(car())).toEqual({});
  });

  it('reports a missing colour under vehicle.color (with other errors together)', () => {
    const dto = car({ color: undefined });
    (dto.data as any).price = 0;
    const fields = run(dto);
    expect(fields['vehicle.color']).toBe('Choose a colour');
    expect(fields['data.price']).toBeDefined();
  });

  it('accepts mileage 0', () => {
    expect(run(car({ mileage: 0 }))).toEqual({});
  });

  it('rejects negative mileage and out-of-range year', () => {
    const fields = run(car({ mileage: -1, year: 1985 }));
    expect(fields['vehicle.mileage']).toBeDefined();
    expect(fields['vehicle.year']).toContain('1990');
  });

  it('allows next model year only', () => {
    expect(run(car({ year: 2027 }))).toEqual({});
    expect(run(car({ year: 2028 }))['vehicle.year']).toBeDefined();
  });

  it('sets isFirstOwner from ownerCount and validates range', () => {
    const dto = normalizeCreateAdV2(car({ ownerCount: 1, isFirstOwner: false }));
    expect((dto.vehicle as any).isFirstOwner).toBe(true);
    expect(run(car({ ownerCount: 11 }))['vehicle.ownerCount']).toBeDefined();
  });

  it('two-wheeler: transmission is optional', () => {
    const dto: any = car({ vehicleType: 'two_wheeler', transmissionTypeId: undefined });
    dto.category = AdCategoryV2.TWO_WHEELER;
    expect(run(dto)).toEqual({});
  });

  it('private vehicle: transmission is required', () => {
    expect(run(car({ transmissionTypeId: undefined }))['vehicle.transmissionTypeId']).toBeDefined();
  });

  it('accepts a title of 10..70 chars and rejects shorter', () => {
    const ok = car();
    (ok.data as any).title = '2019 Maruti Swift VXi';
    expect(run(ok)).toEqual({});
    const bad = car();
    (bad.data as any).title = 'Swift';
    expect(run(bad)['data.title']).toBeDefined();
  });

  it('location: 0,0 coordinates are valid without a label', () => {
    const dto = car();
    delete (dto.data as any).location;
    (dto.data as any).latitude = 0;
    (dto.data as any).longitude = 0;
    expect(run(dto)).toEqual({});
  });

  it('location: label or coordinates are required', () => {
    const dto = car();
    delete (dto.data as any).location;
    expect(run(dto)['data.location']).toBe('Choose a location');
  });

  it('legacy images must be on our bucket', () => {
    const dto = car();
    delete (dto.data as any).mediaIds;
    (dto.data as any).images = ['https://evil.example.com/x.jpg'];
    expect(run(dto)['data.images']).toBeDefined();
    (dto.data as any).images = [
      'https://ado-dad.s3.ap-south-1.amazonaws.com/media/u/1.jpg',
    ];
    expect(run(dto)).toEqual({});
  });

  it('rejects more than 15 mediaIds for two-wheelers', () => {
    const dto: any = car({ vehicleType: 'two_wheeler' });
    dto.category = AdCategoryV2.TWO_WHEELER;
    dto.data.mediaIds = Array.from({ length: 16 }, (_, i) => OID(100 + i));
    expect(run(dto)['data.mediaIds']).toContain('15');
  });

  describe('commercial', () => {
    const commercial = (over: Record<string, any> = {}): CreateAdV2Dto =>
      ({
        category: AdCategoryV2.COMMERCIAL_VEHICLE,
        data: baseData(),
        commercial: { ...car().vehicle, ...over },
      }) as any;

    it('accepts a commercial type that exists in the DB but not in the old enum', () => {
      expect(run(commercial({ commercialVehicleType: 'auto_rickshaws' }))).toEqual({});
    });

    it('rejects an unknown / inactive commercial type', () => {
      const fields = run(commercial({ commercialVehicleType: 'spaceship' }));
      expect(fields['commercial.commercialVehicleType']).toBe('Choose a vehicle type');
    });

    it('axleCount must be 1..10', () => {
      expect(
        run(commercial({ commercialVehicleType: 'truck', axleCount: 0 }))['commercial.axleCount'],
      ).toBeDefined();
      expect(run(commercial({ commercialVehicleType: 'truck', axleCount: 10 }))).toEqual({});
    });
  });

  describe('property', () => {
    const property = (over: Record<string, any> = {}): CreateAdV2Dto =>
      ({
        category: AdCategoryV2.PROPERTY,
        data: baseData(),
        property: {
          listingType: 'sell',
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1100,
          ...over,
        },
      }) as any;

    it('accepts office/shop/warehouse without bedrooms', () => {
      for (const t of ['office', 'shop', 'warehouse']) {
        expect(
          run(property({ propertyType: t, bedrooms: undefined, bathrooms: undefined })),
        ).toEqual({});
      }
    });

    it('forbids bedrooms for a plot', () => {
      const fields = run(property({ propertyType: 'plot', bedrooms: 2, bathrooms: undefined }));
      expect(fields['property.bedrooms']).toContain('plot');
    });

    it('treats legacy 0 bedrooms on a plot as not applicable', () => {
      expect(run(property({ propertyType: 'plot', bedrooms: 0, bathrooms: 0 }))).toEqual({});
    });

    it('requires bedrooms/bathrooms for residential and areaSqft > 0', () => {
      const fields = run(property({ bedrooms: undefined, areaSqft: 0 }));
      expect(fields['property.bedrooms']).toBeDefined();
      expect(fields['property.areaSqft']).toBeDefined();
    });

    it('validates furnishing and derives isFurnished', () => {
      const dto = normalizeCreateAdV2(property({ furnishing: 'semi' }));
      expect((dto.property as any).isFurnished).toBe(true);
      expect(run(property({ furnishing: 'luxury' }))['property.furnishing']).toBeDefined();
    });
  });
});
