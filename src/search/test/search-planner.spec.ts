import { SearchPlanner, SearchRequest } from '../planner/search-planner';
import { SearchKey, SearchPlan } from '../planner/search-plan';
import { SearchQueryService } from '../services/search-query.service';
import { DEFAULT_SCORING } from '../scoring/scoring.config';
import { FIXTURE_IDS as F, makeLexicon } from './lexicon.stub';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';

/**
 * Table-driven contract for the planner: every row of the audit's §C.4 table,
 * driven through the real parser + fixture lexicon so the two stay in step.
 */
describe('SearchPlanner', () => {
  const planner = new SearchPlanner();
  let parser: SearchQueryService;

  const plan = async (req: SearchRequest, opts = { keysFilters: false }): Promise<SearchPlan> => {
    const parsed = req.search ? await parser.parse(req.search) : undefined;
    return planner.plan(req, parsed, opts);
  };
  const step0 = async (req: SearchRequest, opts?: { keysFilters: boolean }) =>
    (await plan(req, opts)).steps[0];

  beforeEach(() => {
    parser = new SearchQueryService(makeLexicon());
  });

  // ---------------------------------------------------------------------------

  describe('feed (no search string)', () => {
    it('returns a feed plan with no steps', async () => {
      const p = await plan({ category: 'private_vehicle', latitude: 9.0, longitude: 76.5 });
      expect(p.strategy).toBe('feed');
      expect(p.steps).toEqual([]);
    });
  });

  describe('models', () => {
    it.each([
      ['creta', F.CRETA],
      ['swift', F.SWIFT],
      ['i20', F.I20],
      ['verna', F.VERNA],
    ])('"%s" → cars filter, model key OR text, category relaxation', async (q, id) => {
      const p = await plan({ search: q });
      expect(p.strategy).toBe('hybrid');
      const s = p.steps[0];
      expect(s.filters.categories).toEqual([AdCategoryV2.PRIVATE_VEHICLE]);
      expect(s.filters.categoryExplicit).toBe(false);
      expect(s.candidates.entityKeys).toEqual([SearchKey.model(id)]);
      expect(s.candidates.text).toBe(q);
      expect(p.steps).toHaveLength(2);
      expect(p.steps[1].filters.categories).toBeUndefined();
      expect(p.steps[1].relaxation).toEqual({ dropped: 'category', reason: 'zero_results' });
    });

    it('"hyundai creta" boosts the brand and keeps the whole text', async () => {
      const s = await step0({ search: 'hyundai creta' });
      expect(s.candidates.entityKeys).toEqual([SearchKey.model(F.CRETA)]);
      expect(s.candidates.text).toBe('hyundai creta');
      expect(s.boosts.keys).toContainEqual({
        key: SearchKey.manufacturer(F.HYUNDAI),
        weight: DEFAULT_SCORING.boosts.brand,
      });
    });

    it('"creta swift" is a union of two model keys', async () => {
      const s = await step0({ search: 'creta swift' });
      expect(s.candidates.entityKeys.sort()).toEqual(
        [SearchKey.model(F.CRETA), SearchKey.model(F.SWIFT)].sort(),
      );
    });

    it('"hyundai swift" filters on the model only (brand implied)', async () => {
      const s = await step0({ search: 'hyundai swift' });
      expect(s.candidates.entityKeys).toEqual([SearchKey.model(F.SWIFT)]);
    });

    it('a model with no derivable category has no category filter', async () => {
      const p = await plan({ search: 'vento' });
      expect(p.steps[0].filters.categories).toBeUndefined();
      expect(p.steps[0].candidates.entityKeys).toEqual([SearchKey.model(F.VENTO)]);
      expect(p.steps).toHaveLength(1);
    });
  });

  describe('brands', () => {
    it('"hyundai" → cars filter, manufacturer key OR text', async () => {
      const s = await step0({ search: 'hyundai' });
      expect(s.filters.categories).toEqual([AdCategoryV2.PRIVATE_VEHICLE]);
      expect(s.candidates.entityKeys).toEqual([SearchKey.manufacturer(F.HYUNDAI)]);
      expect(s.candidates.text).toBe('hyundai');
    });

    it('"honda" spans both categories and both manufacturer documents', async () => {
      const s = await step0({ search: 'honda' });
      expect(s.filters.categories?.sort()).toEqual(
        [AdCategoryV2.PRIVATE_VEHICLE, AdCategoryV2.TWO_WHEELER].sort(),
      );
      expect(s.candidates.entityKeys.sort()).toEqual(
        [SearchKey.manufacturer(F.HONDA_CARS), SearchKey.manufacturer(F.HONDA_BIKES)].sort(),
      );
    });

    it('"tata" with the Cars tab open stays within cars', async () => {
      const p = await plan({ search: 'tata', category: 'private_vehicle' });
      expect(p.conflicts).toEqual([]);
      expect(p.steps[0].filters.categories).toEqual(['private_vehicle']);
      expect(p.steps[0].filters.categoryExplicit).toBe(true);
      expect(p.steps[0].candidates.entityKeys).toEqual([SearchKey.manufacturer(F.TATA)]);
      expect(p.steps).toHaveLength(1); // explicit category is never relaxed
    });
  });

  describe('attributes rank, they do not filter', () => {
    it('"creta 2020" boosts the exact year and sets no year range', async () => {
      const s = await step0({ search: 'creta 2020' });
      expect(s.filters.vehicleYear).toBeUndefined();
      expect(s.filters.legacy.minYear).toBeUndefined();
      expect(s.boosts.exactYear).toEqual({
        year: 2020,
        weight: DEFAULT_SCORING.boosts.exactYear,
        nearWeight: DEFAULT_SCORING.boosts.nearYear,
      });
      expect(s.candidates.text).toBe('creta 2020');
    });

    it('"creta 2018 model" is a typed floor → hard range', async () => {
      const s = await step0({ search: 'creta 2018 model' });
      expect(s.filters.vehicleYear).toEqual({ min: 2018 });
      expect(s.boosts.exactYear).toBeUndefined();
    });

    it('"creta petrol" / "creta automatic" boost fuel and transmission', async () => {
      const a = await step0({ search: 'creta petrol' });
      expect(a.boosts.keys).toContainEqual({ key: SearchKey.fuel(F.PETROL), weight: DEFAULT_SCORING.boosts.fuel });
      expect(a.filters.legacy.fuelTypeIds).toBeUndefined();
      const b = await step0({ search: 'creta automatic' });
      expect(b.boosts.keys).toContainEqual({
        key: SearchKey.transmission(F.AUTOMATIC),
        weight: DEFAULT_SCORING.boosts.transmission,
      });
    });

    it('"red creta" keeps "red" as a word boost and in the text', async () => {
      const s = await step0({ search: 'red creta' });
      expect(s.boosts.words).toEqual(['red']);
      expect(s.candidates.text).toBe('red creta');
      expect(s.candidates.entityKeys).toEqual([SearchKey.model(F.CRETA)]);
    });

    it('"cars under 5 lakh" is a typed price ceiling → hard range', async () => {
      const s = await step0({ search: 'cars under 5 lakh' });
      expect(s.filters.price).toEqual({ max: 500000 });
      expect(s.filters.categories).toEqual([AdCategoryV2.PRIVATE_VEHICLE]);
    });
  });

  describe('explicit filters always win', () => {
    it('client brand/model filters replace parsed entities but keep the text', async () => {
      const s = await step0({ search: 'creta', modelIds: [F.SWIFT] });
      expect(s.candidates.entityKeys).toEqual([]);
      expect(s.candidates.text).toBe('creta');
      expect(s.filters.legacy.modelIds).toEqual([F.SWIFT]);
    });

    it('client fuel filter suppresses the parsed fuel boost', async () => {
      const s = await step0({ search: 'creta petrol', fuelTypeIds: [F.DIESEL] });
      expect(s.boosts.keys.find((k) => k.key.startsWith('fuel:'))).toBeUndefined();
      expect(s.filters.legacy.fuelTypeIds).toEqual([F.DIESEL]);
    });

    it('explicit filters appear in every step', async () => {
      const p = await plan({ search: 'creta', minPrice: 100000, fuelTypeIds: [F.DIESEL] });
      for (const s of p.steps) {
        expect(s.filters.price).toEqual({ min: 100000 });
        expect(s.filters.legacy.fuelTypeIds).toEqual([F.DIESEL]);
      }
    });

    it('with SEARCH_KEYS_FILTERS the same filters become key groups', async () => {
      const s = await step0(
        { search: 'creta', manufacturerIds: [F.HYUNDAI], fuelTypeIds: [F.DIESEL, F.PETROL], minYear: 2015 },
        { keysFilters: true },
      );
      expect(s.filters.keyGroups).toEqual([
        [SearchKey.manufacturer(F.HYUNDAI)],
        [SearchKey.fuel(F.DIESEL), SearchKey.fuel(F.PETROL)],
      ]);
      expect(s.filters.vehicleYear).toEqual({ min: 2015 });
      expect(s.filters.legacy).toEqual({});
    });
  });

  describe('category conflicts', () => {
    it('Bikes tab + "creta": text within bikes, entity dropped, conflict reported', async () => {
      const p = await plan({ search: 'creta', category: 'two_wheeler' });
      expect(p.conflicts).toEqual([
        {
          kind: 'category',
          parsed: 'model:Creta',
          parsedCategory: 'private_vehicle',
          explicitCategory: 'two_wheeler',
        },
      ]);
      expect(p.steps).toHaveLength(1);
      expect(p.steps[0].filters.categories).toEqual(['two_wheeler']);
      expect(p.steps[0].candidates.entityKeys).toEqual([]);
      expect(p.steps[0].candidates.text).toBe('creta');
      expect(p.strategy).toBe('text');
    });

    it('Bikes tab + "honda" is not a conflict (Honda sells bikes)', async () => {
      const p = await plan({ search: 'honda', category: 'two_wheeler' });
      expect(p.conflicts).toEqual([]);
      expect(p.steps[0].candidates.entityKeys).toHaveLength(2);
    });

    it('Property tab + "hyundai" is a conflict', async () => {
      const p = await plan({ search: 'hyundai', category: 'property' });
      expect(p.conflicts[0]?.parsed).toBe('brand:Hyundai');
      expect(p.steps[0].candidates.entityKeys).toEqual([]);
    });
  });

  describe('location', () => {
    it('"creta kollam" → hard circle at the Kollam centroid, decay origin there', async () => {
      const p = await plan({ search: 'creta kollam', latitude: 10.0, longitude: 76.3 });
      const g = p.steps[0].filters.geoWithin!;
      expect(g.radiusKm).toBeGreaterThan(0);
      expect(g.lat).toBeCloseTo(8.89, 1);
      expect(p.scoring.origin).toEqual({ lng: g.lng, lat: g.lat });
      expect(p.steps[0].candidates.text).toBe('creta');
    });

    it('device lat/lng without a radius is only a decay origin', async () => {
      const p = await plan({ search: 'creta', latitude: 9.0, longitude: 76.5 });
      expect(p.steps[0].filters.geoWithin).toBeUndefined();
      expect(p.scoring.origin).toEqual({ lng: 76.5, lat: 9.0 });
    });

    it('an explicit radius from the client beats a typed place', async () => {
      const p = await plan({ search: 'creta kollam', latitude: 9.0, longitude: 76.5, maxDistance: 10 });
      expect(p.steps[0].filters.geoWithin).toEqual({ lng: 76.5, lat: 9.0, radiusKm: 10 });
    });

    it('"cars in kochi" is category-only with a place, no text', async () => {
      const p = await plan({ search: 'cars in kochi' });
      expect(p.strategy).toBe('category');
      expect(p.steps[0].candidates.text).toBe('');
      expect(p.steps[0].candidates.entityKeys).toEqual([]);
      expect(p.steps[0].filters.geoWithin).toBeDefined();
      expect(p.steps).toHaveLength(1);
    });
  });

  describe('weak and unknown queries', () => {
    it('"nice family car" is text within cars with a relaxation step', async () => {
      const p = await plan({ search: 'nice family car' });
      expect(p.strategy).toBe('text');
      expect(p.steps[0].filters.categories).toEqual([AdCategoryV2.PRIVATE_VEHICLE]);
      expect(p.steps[0].candidates.text).toBe('nice family');
      expect(p.steps[1].filters.categories).toBeUndefined();
    });

    it('"xyzabc" is text only, one step', async () => {
      const p = await plan({ search: 'xyzabc' });
      expect(p.strategy).toBe('text');
      expect(p.steps).toHaveLength(1);
      expect(p.steps[0].candidates.text).toBe('xyzabc');
    });

    it('a hint-only lexicon turns "creta" into text within cars, never "all cars"', async () => {
      parser = new SearchQueryService(makeLexicon({ inventory: false }));
      const p = await plan({ search: 'creta' });
      expect(p.strategy).toBe('text');
      expect(p.steps[0].candidates.entityKeys).toEqual([]);
      expect(p.steps[0].candidates.text).toBe('creta');
      expect(p.steps[0].filters.categories).toEqual([AdCategoryV2.PRIVATE_VEHICLE]);
      expect(p.steps[1].filters.categories).toBeUndefined();
    });

    it('with no parser at all the whole query is the text clause', () => {
      const p = planner.plan({ search: 'Hyundai Creta' }, undefined, { keysFilters: false });
      expect(p.strategy).toBe('text');
      expect(p.steps[0].candidates.text).toBe('hyundai creta');
    });
  });

  describe('paging and sorting', () => {
    it('defaults to scored order, page 1, limit 20, with spare rows for diversity', async () => {
      const p = await plan({ search: 'creta' });
      expect(p.sort).toEqual({ by: 'score', order: 'DESC' });
      expect(p.page).toEqual({ page: 1, limit: 20, offset: 0, spare: 10, includeTotal: true });
    });

    it('honours an explicit sort and caps the page', async () => {
      const p = await plan({ search: 'creta', sortBy: 'price', sortOrder: 'ASC', page: 999, limit: 500 });
      expect(p.sort).toEqual({ by: 'price', order: 'ASC' });
      expect(p.page.page).toBe(DEFAULT_SCORING.pageCap);
      expect(p.page.limit).toBe(100);
      expect(p.page.spare).toBe(0);
    });
  });
});
