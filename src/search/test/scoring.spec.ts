import {
  DEFAULT_SCORING,
  distanceDecay,
  freshnessDecay,
  loadScoringConfig,
  relevance,
  sellerQuality,
  totalScore,
} from '../scoring/scoring.config';
import { applySellerDiversity } from '../scoring/diversity';

describe('scoring', () => {
  describe('distanceDecay', () => {
    it('is 1 at the origin and strictly decreasing', () => {
      expect(distanceDecay(0)).toBe(1);
      const d = [5, 10, 20, 40, 60, 100].map((km) => distanceDecay(km));
      for (let i = 1; i < d.length; i++) expect(d[i]).toBeLessThan(d[i - 1]);
    });

    it('never drops below the floor, so far ads still appear after near ones', () => {
      expect(distanceDecay(500)).toBe(DEFAULT_SCORING.distanceFloor);
      expect(distanceDecay(5000)).toBe(DEFAULT_SCORING.distanceFloor);
    });

    it('is neutral when there is no distance', () => {
      expect(distanceDecay(undefined)).toBe(1);
      expect(distanceDecay(null)).toBe(1);
    });

    it('roughly halves around 33 km with the default sigma', () => {
      expect(distanceDecay(33)).toBeGreaterThan(0.45);
      expect(distanceDecay(33)).toBeLessThan(0.55);
    });
  });

  describe('freshnessDecay', () => {
    it('halves every half-life and floors', () => {
      expect(freshnessDecay(0)).toBe(1);
      expect(freshnessDecay(DEFAULT_SCORING.freshnessHalfLifeDays)).toBeCloseTo(0.5, 5);
      expect(freshnessDecay(2 * DEFAULT_SCORING.freshnessHalfLifeDays)).toBeCloseTo(0.25, 5);
      expect(freshnessDecay(365)).toBe(DEFAULT_SCORING.freshnessFloor);
    });
  });

  describe('sellerQuality', () => {
    it('rewards verified sellers and penalises ads with no images', () => {
      expect(sellerQuality({ sellerVerified: true, imageCount: 3 })).toBeCloseTo(1.1);
      expect(sellerQuality({ sellerVerified: false, imageCount: 0 })).toBeCloseTo(0.9);
      expect(sellerQuality({})).toBeCloseTo(0.9);
      expect(sellerQuality({ imageCount: 1 })).toBe(1);
    });
  });

  describe('relevance and total', () => {
    it('an entity hit outranks any text-only hit at equal boosts', () => {
      expect(relevance({ structuredHit: true, boost: 0 })).toBeGreaterThan(
        relevance({ structuredHit: false, textScore: 100, boost: 0 }),
      );
    });

    it('boosts reorder within a class: petrol Creta above diesel Creta', () => {
      const petrol = relevance({ structuredHit: true, boost: DEFAULT_SCORING.boosts.fuel });
      const diesel = relevance({ structuredHit: true, boost: 0 });
      expect(petrol).toBeGreaterThan(diesel);
    });

    it('a near, fresh ad beats a far, stale one with the same relevance', () => {
      const base = { structuredHit: true, boost: 0, sellerVerified: false, imageCount: 2 };
      const near = totalScore({ ...base, distanceKm: 3, ageDays: 1 });
      const far = totalScore({ ...base, distanceKm: 120, ageDays: 40 });
      expect(near).toBeGreaterThan(far);
    });

    it('a near text hit can outrank a far entity match, which still stays on the page', () => {
      // 10 × floor(0.05) = 0.5 vs 4 × 1 = 4: the distance floor keeps far entity
      // matches on the page (score > 0) but a genuinely near text hit wins.
      const farEntity = totalScore({ structuredHit: true, boost: 0, distanceKm: 200, ageDays: 0, imageCount: 1 });
      const nearText = totalScore({ structuredHit: false, textScore: 5, boost: 0, distanceKm: 1, ageDays: 0, imageCount: 1 });
      expect(nearText).toBeGreaterThan(farEntity);
      expect(farEntity).toBeGreaterThan(0);
    });
  });

  describe('loadScoringConfig', () => {
    it('reads overrides from the environment and ignores garbage', () => {
      const cfg = loadScoringConfig({
        SEARCH_DISTANCE_SIGMA_KM: '25',
        SEARCH_FRESHNESS_HALF_LIFE_DAYS: 'abc',
        SEARCH_DIVERSITY_PER_SELLER: '2',
      } as NodeJS.ProcessEnv);
      expect(cfg.distanceSigmaKm).toBe(25);
      expect(cfg.freshnessHalfLifeDays).toBe(DEFAULT_SCORING.freshnessHalfLifeDays);
      expect(cfg.diversityPerSellerPage1).toBe(2);
    });
  });
});

describe('applySellerDiversity', () => {
  const row = (id: string, seller: string) => ({ id, seller });

  it('keeps at most N per seller in place and refills from the rest', () => {
    const rows = [
      row('a1', 'A'), row('a2', 'A'), row('a3', 'A'), row('a4', 'A'),
      row('b1', 'B'), row('a5', 'A'), row('c1', 'C'),
    ];
    const out = applySellerDiversity(rows, 5, 3, (r) => r.seller);
    expect(out.map((r) => r.id)).toEqual(['a1', 'a2', 'a3', 'b1', 'c1']);
  });

  it('appends the overflow after everyone else when there is room', () => {
    const rows = [row('a1', 'A'), row('a2', 'A'), row('a3', 'A'), row('b1', 'B')];
    const out = applySellerDiversity(rows, 10, 2, (r) => r.seller);
    expect(out.map((r) => r.id)).toEqual(['a1', 'a2', 'b1', 'a3']);
  });

  it('is a no-op when disabled or trivially small', () => {
    const rows = [row('a1', 'A'), row('a2', 'A')];
    expect(applySellerDiversity(rows, 10, 0, (r) => r.seller)).toEqual(rows);
    expect(applySellerDiversity([rows[0]], 10, 1, (r) => r.seller)).toEqual([rows[0]]);
  });

  it('rows without a seller are never demoted', () => {
    const rows = [row('x', ''), row('a1', 'A'), row('a2', 'A'), row('y', '')];
    const out = applySellerDiversity(rows, 10, 1, (r) => r.seller || undefined);
    expect(out.map((r) => r.id)).toEqual(['x', 'a1', 'y', 'a2']);
  });
});
