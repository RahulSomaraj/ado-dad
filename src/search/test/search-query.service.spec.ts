import { SearchQueryService } from '../services/search-query.service';
import { makeLexicon } from './lexicon.stub';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';
import { AdListingType, PropertyTypeEnum } from '../../ads/schemas/property-ad.schema';
import { LocationKind } from '../schemas/location-term.schema';

describe('SearchQueryService', () => {
  let svc: SearchQueryService;

  beforeEach(() => {
    svc = new SearchQueryService(makeLexicon());
  });

  // ===========================================================================
  // The reported bug — these four are the acceptance criteria
  // ===========================================================================

  describe('the reported queries (V-S1..V-S4)', () => {
    it('V-S1: "cars" resolves to the private_vehicle category, not free text', async () => {
      const p = await svc.parse('cars');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.freeText).toBe('');
      expect(p.confidence).toBe(1);
      expect(p.applyAsFilter).toBe(true);
      expect(p.chips.map((c) => c.label)).toEqual(['Cars']);
    });

    it('V-S2: "bikes in kollam" resolves to two_wheeler + Kollam district', async () => {
      const p = await svc.parse('bikes in kollam');
      expect(p.category).toBe(AdCategoryV2.TWO_WHEELER);
      expect(p.location).toMatchObject({
        slug: 'kollam',
        kind: LocationKind.DISTRICT,
        displayName: 'Kollam',
      });
      expect(p.freeText).toBe('');
      expect(p.applyAsFilter).toBe(true);
    });

    it('V-S3: "property in kollam" resolves to the property category in Kollam', async () => {
      const p = await svc.parse('property in kollam');
      expect(p.category).toBe(AdCategoryV2.PROPERTY);
      expect(p.location?.slug).toBe('kollam');
      expect(p.freeText).toBe('');
    });

    it('V-S4: "2bhk flat for rent kollam" resolves every dimension', async () => {
      const p = await svc.parse('2bhk flat for rent kollam');
      expect(p.category).toBe(AdCategoryV2.PROPERTY);
      expect(p.propertyTypes).toEqual([PropertyTypeEnum.APARTMENT]);
      expect(p.listingType).toBe(AdListingType.RENT);
      expect(p.bedrooms).toBe(2);
      expect(p.location?.slug).toBe('kollam');
      expect(p.freeText).toBe('');
    });
  });

  // ===========================================================================
  // Location handling
  // ===========================================================================

  describe('gazetteer', () => {
    it('V-S11: resolves colonial-era aliases to the same slug', async () => {
      const quilon = await svc.parse('activa quilon');
      const kollam = await svc.parse('activa kollam');
      expect(quilon.location?.slug).toBe('kollam');
      expect(kollam.location?.slug).toBe('kollam');
      expect(quilon.modelNames).toEqual(['Activa']);
      expect(quilon.category).toBe(AdCategoryV2.TWO_WHEELER);
    });

    it.each([
      ['trivandrum', 'thiruvananthapuram'],
      ['cochin', 'ernakulam'],
      ['ekm', 'ernakulam'],
      ['calicut', 'kozhikode'],
      ['trichur', 'thrissur'],
      ['alleppey', 'alappuzha'],
      ['palghat', 'palakkad'],
      ['cannanore', 'kannur'],
    ])('maps "%s" to the %s district', async (alias, slug) => {
      const p = await svc.parse(`cars in ${alias}`);
      expect(p.location?.slug).toBe(slug);
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
    });

    it('prefers the town over the district containing it', async () => {
      const p = await svc.parse('bikes in punalur');
      expect(p.location?.slug).toBe('punalur');
      expect(p.location?.kind).toBe(LocationKind.CITY);
      expect(p.location?.district).toBe('kollam');
    });

    it('refines district → town when both are present', async () => {
      const p = await svc.parse('cars in kollam punalur');
      expect(p.location?.slug).toBe('punalur');
    });

    it('resolves a location placed before the category', async () => {
      const p = await svc.parse('kollam cars');
      expect(p.location?.slug).toBe('kollam');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
    });

    it('handles the Malayalam spelling of a district', async () => {
      const p = await svc.parse('കാർ കൊല്ലം');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.location?.slug).toBe('kollam');
    });
  });

  // ===========================================================================
  // Vehicle catalogue
  // ===========================================================================

  describe('brand / model / variant', () => {
    it('V-S5: "swift dzire vdi 2018 under 5 lakh" is fully structured', async () => {
      const p = await svc.parse('swift dzire vdi 2018 under 5 lakh');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.variantIds).toHaveLength(1);
      expect(p.modelNames).toEqual(['Swift Dzire']);
      expect(p.manufacturerNames).toEqual(['Maruti Suzuki']);
      expect(p.minYear).toBe(2018);
      expect(p.maxPrice).toBe(500000);
      expect(p.freeText).toBe('');
    });

    it('prefers the longest phrase: brand+model beats the bare model', async () => {
      const p = await svc.parse('maruti suzuki swift dzire');
      expect(p.modelNames).toEqual(['Swift Dzire']);
      expect(p.manufacturerIds).toHaveLength(1);
      expect(p.freeText).toBe('');
    });

    it('applies both payloads when a phrase is category + model', async () => {
      const p = await svc.parse('bullet');
      expect(p.category).toBe(AdCategoryV2.TWO_WHEELER);
      expect(p.modelNames).toEqual(['Bullet']);
      expect(p.manufacturerNames).toEqual(['Royal Enfield']);
    });

    it('captures fuel and transmission', async () => {
      const p = await svc.parse('diesel automatic cars in kochi');
      expect(p.fuelTypeIds).toHaveLength(1);
      expect(p.transmissionTypeIds).toHaveLength(1);
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.location?.slug).toBe('ernakulam');
    });
  });

  // ===========================================================================
  // Numeric intents
  // ===========================================================================

  describe('numeric rules', () => {
    it.each([
      ['cars under 5 lakh', 'maxPrice', 500000],
      ['cars under 5lakh', 'maxPrice', 500000],
      ['bikes below 50000', 'maxPrice', 50000],
      ['cars above 3 lakh', 'minPrice', 300000],
      ['property under 1 crore', 'maxPrice', 10000000],
      ['bikes less than 80k', 'maxPrice', 80000],
    ])('parses "%s" into %s=%s', async (query, field, value) => {
      const p = await svc.parse(query);
      expect((p as any)[field]).toBe(value);
    });

    it('reads a bare amount as a budget ceiling and flags it as inferred', async () => {
      const p = await svc.parse('cars 5 lakh');
      expect(p.maxPrice).toBe(500000);
      expect(p.chips.find((c) => c.filterKey === 'maxPrice')?.inferred).toBe(true);
      // The inference costs confidence, so a query resting only on it is weaker.
      expect(p.confidence).toBeLessThan(1);
    });

    it('reads "2018 model" as a floor, not an exact year', async () => {
      const p = await svc.parse('swift dzire 2018 model');
      expect(p.minYear).toBe(2018);
      expect(p.maxYear).toBeUndefined();
    });

    it('does not mistake a small bare number for money', async () => {
      const p = await svc.parse('2 bhk kollam');
      expect(p.bedrooms).toBe(2);
      expect(p.maxPrice).toBeUndefined();
    });

    it('strips Indian digit grouping', async () => {
      const p = await svc.parse('cars under 5,00,000');
      expect(p.maxPrice).toBe(500000);
    });
  });

  // ===========================================================================
  // Safety rails
  // ===========================================================================

  describe('safety rails', () => {
    it('V-S6: an unmatched query stays pure free text', async () => {
      const p = await svc.parse('red sofa');
      expect(p.category).toBeUndefined();
      expect(p.location).toBeUndefined();
      expect(p.freeText).toBe('red sofa');
      expect(p.confidence).toBe(0);
      expect(p.applyAsFilter).toBe(false);
    });

    it('does not hard-filter on a single weak match in a long query', async () => {
      // "car" matches, but three of four meaningful tokens did not — this must
      // not force a car-wash query into the Cars category.
      const p = await svc.parse('car wash service center');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.confidence).toBeLessThan(0.34);
      expect(p.applyAsFilter).toBe(false);
    });

    it('V-S8: regex metacharacters survive as literal free text', async () => {
      const p = await svc.parse('(a+)+$ .*');
      expect(p.applyAsFilter).toBe(false);
      expect(p.freeText).not.toContain('(');
      expect(p.freeText).not.toContain('*');
    });

    it('resolves a vehicle/property clash instead of returning both', async () => {
      const p = await svc.parse('swift dzire villa');
      // Both cannot match one ad; the weaker side is dropped and reported.
      const hasVehicle = (p.modelIds?.length ?? 0) > 0;
      const hasProperty = (p.propertyTypes?.length ?? 0) > 0;
      expect(hasVehicle && hasProperty).toBe(false);
      expect(p.ambiguities.length).toBeGreaterThan(0);
    });

    it('handles an empty or whitespace query', async () => {
      for (const q of ['', '   ', null, undefined]) {
        const p = await svc.parse(q as any);
        expect(p.category).toBeUndefined();
        expect(p.chips).toEqual([]);
        expect(p.applyAsFilter).toBe(false);
      }
    });

    it('ignores stop words when scoring confidence', async () => {
      const p = await svc.parse('i want to buy a car in kollam');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.location?.slug).toBe('kollam');
      expect(p.confidence).toBe(1);
    });
  });

  // ===========================================================================
  // Chips
  // ===========================================================================

  describe('chips', () => {
    it('spans index into the raw query so the UI can strike out the words', async () => {
      const raw = 'cars in kollam';
      const p = await svc.parse(raw);
      const category = p.chips.find((c) => c.kind === 'category')!;
      const location = p.chips.find((c) => c.kind === 'location')!;
      expect(raw.slice(...category.sourceSpan)).toBe('cars');
      expect(raw.slice(...location.sourceSpan)).toBe('kollam');
    });

    it('preserves spans through punctuation and mixed case', async () => {
      const raw = 'Bikes,  in   Quilon!';
      const p = await svc.parse(raw);
      const location = p.chips.find((c) => c.kind === 'location')!;
      expect(raw.slice(...location.sourceSpan)).toBe('Quilon');
    });

    it('orders chips by their position in the query', async () => {
      const p = await svc.parse('2bhk flat for rent in kollam');
      const positions = p.chips.map((c) => c.sourceSpan[0]);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('exposes the request field each chip maps to', async () => {
      const p = await svc.parse('cars in kollam under 5 lakh');
      const keys = p.chips.map((c) => c.filterKey).sort();
      expect(keys).toEqual(['category', 'location', 'maxPrice']);
    });
  });
});
