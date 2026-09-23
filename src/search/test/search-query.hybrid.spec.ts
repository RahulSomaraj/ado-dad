import { SearchQueryService } from '../services/search-query.service';
import { FIXTURE_IDS as F, makeLexicon } from './lexicon.stub';
import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';

/**
 * Tier-1 parser contract: the parser proposes, never deletes, and says how sure
 * it is. Every case here is one row of the audit's §C.4 table.
 */
describe('SearchQueryService — hybrid contract', () => {
  let svc: SearchQueryService;

  beforeEach(() => {
    svc = new SearchQueryService(makeLexicon());
  });

  // ---------------------------------------------------------------------------
  // Words are never lost
  // ---------------------------------------------------------------------------

  describe('never loses the query', () => {
    it.each([
      'creta',
      'hyundai creta',
      'cars in kollam',
      'red creta 2020 petrol',
      'nice family car',
    ])('"%s" keeps every word in normalized', async (q) => {
      const p = await svc.parse(q);
      expect(p.normalized).toBe(q.toLowerCase());
    });

    it('keeps entity and attribute words in textQuery, drops structural ones', async () => {
      const p = await svc.parse('red creta 2020 petrol in kollam under 5 lakh');
      // "in", "kollam", "under 5 lakh" are filters; the rest is text.
      expect(p.textQuery).toBe('red creta 2020 petrol');
      expect(p.location?.slug).toBe('kollam');
      expect(p.maxPrice).toBe(500000);
    });

    it('a category-only query has an empty textQuery', async () => {
      const p = await svc.parse('cars in kochi');
      expect(p.textQuery).toBe('');
      expect(p.strength).toBe('category');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.location?.slug).toBe('ernakulam');
    });
  });

  // ---------------------------------------------------------------------------
  // Models and brands
  // ---------------------------------------------------------------------------

  describe('models', () => {
    it.each([
      ['creta', F.CRETA, 'Creta'],
      ['swift', F.SWIFT, 'Swift'],
      ['i20', F.I20, 'i20'],
      ['verna', F.VERNA, 'Verna'],
    ])('"%s" is a strong model match', async (q, id, name) => {
      const p = await svc.parse(q);
      expect(p.strength).toBe('strong');
      expect(p.catalogueMatch).toBe(true);
      expect(p.modelIds).toEqual([id]);
      expect(p.modelNames).toEqual([name]);
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.categorySource).toBe('entity');
      expect(p.textQuery).toBe(q);
      expect(p.applyAsFilter).toBe(true);
    });

    it('"hyundai creta" resolves the brand+model phrase, brand implied', async () => {
      const p = await svc.parse('hyundai creta');
      expect(p.strength).toBe('strong');
      expect(p.modelIds).toEqual([F.CRETA]);
      expect(p.manufacturerIds).toEqual([F.HYUNDAI]);
      expect(p.textQuery).toBe('hyundai creta');
    });

    it('the brand chip stays on the word the user typed for it', async () => {
      // "hyundai" and "creta" match separately here (the year sits between
      // them); the model payload names Hyundai again but must not move the
      // brand chip onto "creta".
      const q = 'hyundai 2020 creta';
      const p = await svc.parse(q);
      const brand = p.chips.find((c) => c.kind === 'brand')!;
      expect(q.slice(...brand.sourceSpan)).toBe('hyundai');
      const model = p.chips.find((c) => c.kind === 'model')!;
      expect(q.slice(...model.sourceSpan)).toBe('creta');
      expect(p.manufacturerIds).toEqual([F.HYUNDAI]);
    });

    it('"creta swift" is two models (union)', async () => {
      const p = await svc.parse('creta swift');
      expect(p.strength).toBe('strong');
      expect(p.modelIds?.sort()).toEqual([F.CRETA, F.SWIFT].sort());
    });

    it('"hyundai swift" keeps the model; the mismatched brand rides along for the planner', async () => {
      const p = await svc.parse('hyundai swift');
      expect(p.modelIds).toEqual([F.SWIFT]);
      expect(p.manufacturerIds?.sort()).toEqual([F.HYUNDAI, F.MARUTI].sort());
    });

    it('a model with no derivable category is still a catalogue match, but not a legacy filter', async () => {
      const p = await svc.parse('vento');
      expect(p.strength).toBe('strong');
      expect(p.modelIds).toEqual([F.VENTO]);
      expect(p.category).toBeUndefined();
      expect(p.applyAsFilter).toBe(false); // the legacy path would drop the filter silently
    });
  });

  describe('brands', () => {
    it('"hyundai" alone decides the category from the brand payload', async () => {
      const p = await svc.parse('hyundai');
      expect(p.strength).toBe('strong');
      expect(p.manufacturerIds).toEqual([F.HYUNDAI]);
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.categorySource).toBe('entity');
    });

    it('"honda" is both manufacturer documents and both categories', async () => {
      const p = await svc.parse('honda');
      expect(p.manufacturerIds?.sort()).toEqual([F.HONDA_CARS, F.HONDA_BIKES].sort());
      expect(p.category).toBeUndefined();
      expect(p.brandCategories?.sort()).toEqual(
        [AdCategoryV2.PRIVATE_VEHICLE, AdCategoryV2.TWO_WHEELER].sort(),
      );
      expect(p.manufacturerNames).toEqual(['Honda']);
      expect(p.chips.filter((c) => c.kind === 'brand')).toHaveLength(1);
    });

    it('"tata" spans cars and commercial vehicles', async () => {
      const p = await svc.parse('tata');
      expect(p.brandCategories?.sort()).toEqual(
        [AdCategoryV2.COMMERCIAL_VEHICLE, AdCategoryV2.PRIVATE_VEHICLE].sort(),
      );
    });

    it('a brand with no categories in its payload leaves category open', async () => {
      const p = await svc.parse('volkswagen');
      expect(p.manufacturerIds).toEqual([F.VOLKSWAGEN]);
      expect(p.category).toBeUndefined();
      expect(p.brandCategories).toBeUndefined();
      expect(p.applyAsFilter).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Attributes rank, they do not filter
  // ---------------------------------------------------------------------------

  describe('attributes', () => {
    it('"creta 2020" exposes the exact year as a boost, minYear for legacy', async () => {
      const p = await svc.parse('creta 2020');
      expect(p.exactYear).toBe(2020);
      expect(p.minYear).toBe(2020);
      expect(p.strength).toBe('strong');
      expect(p.textQuery).toBe('creta 2020');
    });

    it('"2018 model" is a real floor, not an exact year', async () => {
      const p = await svc.parse('creta 2018 model');
      expect(p.minYear).toBe(2018);
      expect(p.exactYear).toBeUndefined();
    });

    it('"creta petrol" and "creta automatic" attach fuel/transmission ids', async () => {
      const a = await svc.parse('creta petrol');
      expect(a.fuelTypeIds).toEqual([F.PETROL]);
      expect(a.strength).toBe('strong');
      const b = await svc.parse('creta automatic');
      expect(b.transmissionTypeIds).toEqual([F.AUTOMATIC]);
    });

    it('"red creta" is partial: model plus an unknown word', async () => {
      const p = await svc.parse('red creta');
      expect(p.strength).toBe('partial');
      expect(p.modelIds).toEqual([F.CRETA]);
      expect(p.textQuery).toBe('red creta');
      expect(p.freeText).toBe('red');
    });
  });

  // ---------------------------------------------------------------------------
  // Hints: an unmaterialised lexicon must not fabricate filters
  // ---------------------------------------------------------------------------

  describe('seed hints without a catalogue (L0)', () => {
    beforeEach(() => {
      svc = new SearchQueryService(makeLexicon({ inventory: false }));
    });

    it('"creta" is weak: category hint only, text kept, no legacy filter', async () => {
      const p = await svc.parse('creta');
      expect(p.strength).toBe('weak');
      expect(p.catalogueMatch).toBe(false);
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
      expect(p.categorySource).toBe('hint');
      expect(p.modelIds).toBeUndefined();
      expect(p.textQuery).toBe('creta');
      expect(p.freeText).toBe('creta');
      expect(p.applyAsFilter).toBe(false);
      expect(p.chips.find((c) => c.kind === 'category')?.inferred).toBe(true);
    });

    it('"hyundai creta" without a catalogue is weak, brand unknown', async () => {
      const p = await svc.parse('hyundai creta');
      expect(p.strength).toBe('weak');
      expect(p.manufacturerIds).toBeUndefined();
      expect(p.textQuery).toBe('hyundai creta');
      expect(p.freeText).toBe('hyundai creta');
    });

    it('"creta kollam" still applies the location', async () => {
      const p = await svc.parse('creta kollam');
      expect(p.location?.slug).toBe('kollam');
      expect(p.textQuery).toBe('creta');
      expect(p.strength).toBe('category'); // half the words are structural; category comes from the hint
      expect(p.categorySource).toBe('hint');
    });
  });

  // ---------------------------------------------------------------------------
  // Strength classes
  // ---------------------------------------------------------------------------

  describe('strength', () => {
    it.each([
      ['creta', 'strong'],
      ['hyundai creta 2020 petrol', 'strong'],
      ['red creta', 'partial'],
      ['cars in kochi', 'category'],
      ['2bhk flat for rent', 'category'],
      ['nice family car', 'weak'],
      ['car wash service center', 'weak'],
      ['xyzabc', 'none'],
      ['red sofa', 'none'],
    ])('"%s" → %s', async (q, strength) => {
      const p = await svc.parse(q);
      expect(p.strength).toBe(strength);
    });

    it('a vehicle/property clash is never strong', async () => {
      const p = await svc.parse('swift dzire villa');
      expect(p.strength).not.toBe('strong');
      expect(p.ambiguities.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Spelling correction
  // ---------------------------------------------------------------------------

  describe('corrections', () => {
    it.each([
      ['cretta', 'creta', F.CRETA],
      ['swfit', 'swift', F.SWIFT],
      ['hyundai cretta', 'creta', F.CRETA],
      ['hyndai creta', 'hyundai', F.CRETA],
    ])('"%s" corrects to %s and resolves the model', async (q, to, modelId) => {
      const p = await svc.parse(q);
      expect(p.corrections.map((c) => c.to)).toContain(to);
      expect(p.modelIds).toEqual([modelId]);
      expect(p.strength).toBe('strong');
      expect(p.textQuery).toContain(to);
      expect(p.textQuery).not.toContain(q.split(' ').find((w) => w !== 'hyundai' && w !== 'creta'));
      const chip = p.chips.find((c) => c.kind === 'correction')!;
      expect(chip).toBeDefined();
      expect(q.slice(...chip.sourceSpan)).toBe(p.corrections[0].from);
    });

    it('"vagonar" reaches the seed hint through the phonetic key', async () => {
      const p = await svc.parse('vagonar');
      expect(p.corrections[0]?.to).toBe('wagonr');
      expect(p.corrections[0]?.via).toBe('phonetic');
      expect(p.category).toBe(AdCategoryV2.PRIVATE_VEHICLE);
    });

    it('corrects a place name after a locative preposition', async () => {
      // "kolam" is already a gazetteer alias; "kollamm" is not.
      const p = await svc.parse('cars in kollamm');
      expect(p.location?.slug).toBe('kollam');
      expect(p.corrections[0]?.from).toBe('kollamm');
      expect(p.corrections[0]?.to).toBe('kollam');
    });

    it('never corrects "activa" into "access" or "verna" into "vento"', async () => {
      const a = await svc.parse('activa');
      expect(a.corrections).toEqual([]);
      expect(a.modelIds).toEqual([F.ACTIVA]);
      const v = await svc.parse('verna');
      expect(v.corrections).toEqual([]);
      expect(v.modelIds).toEqual([F.VERNA]);
    });

    it('leaves an ambiguous misspelling alone', async () => {
      // "venuo" is one edit from both venue and vento: no correction, text only.
      const p = await svc.parse('venuo');
      expect(p.corrections).toEqual([]);
      expect(p.modelIds).toBeUndefined();
      expect(p.strength).toBe('none');
      expect(p.textQuery).toBe('venuo');
    });

    it('can be switched off', async () => {
      svc.fuzzyEnabled = false;
      const p = await svc.parse('cretta');
      expect(p.corrections).toEqual([]);
      expect(p.strength).toBe('none');
    });
  });
});
