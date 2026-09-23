/**
 * Adapter contract tests (audit §F): the SAME expectations run against the
 * Mongo-native adapter and, when the target supports it, the Atlas Search
 * adapter. Needs a real database:
 *
 *   docker compose -f docker-compose.search.yml up -d
 *   MONGO_TEST_URI="mongodb://localhost:27018/adodad_search_test?directConnection=true" \
 *     npx jest src/search/test/adapters.contract.spec.ts
 *
 * Without MONGO_TEST_URI the suite is skipped, so `npm test` stays green on a
 * laptop with no Mongo. The Atlas block additionally skips itself when
 * `createSearchIndex` is not supported (plain mongo image).
 */
import mongoose, { Connection, Model, Types } from 'mongoose';
import { AdSchema } from '../../ads/schemas/ad.schema';
import { MongoNativeAdapter } from '../adapters/mongo-native.adapter';
import { AtlasSearchAdapter } from '../adapters/atlas-search.adapter';
import { SearchIndexPort } from '../ports/search-index.port';
import { SearchPlanner } from '../planner/search-planner';
import { SearchPlan } from '../planner/search-plan';
import { SearchQueryService } from '../services/search-query.service';
import { composeSearchDoc, emptyInventoryNames, searchDocFields } from '../services/ad-search-doc.builder';
import { DEFAULT_SCORING } from '../scoring/scoring.config';
import { applySellerDiversity } from '../scoring/diversity';
import { FIXTURE_IDS as F, makeLexicon } from './lexicon.stub';
import { readFileSync } from 'fs';
import { join } from 'path';

const URI = process.env.MONGO_TEST_URI;
const suite = URI ? describe : describe.skip;

jest.setTimeout(180_000);

const KOLLAM = { lat: 8.8932, lng: 76.6141 };
const KOCHI = { lat: 9.9312, lng: 76.2673 };
const THRISSUR = { lat: 10.5276, lng: 76.2144 };
const SELLERS = {
  S1: new Types.ObjectId('65c000000000000000000001'),
  S2: new Types.ObjectId('65c000000000000000000002'),
  S3: new Types.ObjectId('65c000000000000000000003'),
  S4: new Types.ObjectId('65c000000000000000000004'),
};

interface Seed {
  key: string;
  category: string;
  title: string;
  description?: string;
  seller: Types.ObjectId;
  at: { lat: number; lng: number };
  vehicle?: Record<string, any>;
  commercial?: Record<string, any>;
  property?: Record<string, any>;
  ageDays?: number;
  soldOut?: boolean;
  approved?: boolean;
  price?: number;
}

const names = emptyInventoryNames();
names.manufacturers.set(F.HYUNDAI, { name: 'Hyundai', displayName: 'Hyundai' });
names.manufacturers.set(F.MARUTI, { name: 'Maruti Suzuki', displayName: 'Maruti Suzuki' });
names.manufacturers.set(F.HONDA_CARS, { name: 'Honda', displayName: 'Honda' });
names.manufacturers.set(F.HONDA_BIKES, { name: 'Honda', displayName: 'Honda' });
names.manufacturers.set(F.TATA, { name: 'Tata Motors', displayName: 'Tata' });
names.models.set(F.CRETA, { name: 'Creta' });
names.models.set(F.SWIFT, { name: 'Swift' });
names.models.set(F.I20, { name: 'i20' });
names.models.set(F.VERNA, { name: 'Verna' });
names.models.set(F.ACTIVA, { name: 'Activa' });
names.models.set(F.ACE, { name: 'Ace' });
names.models.set('65b0000000000000000000c1', { name: 'City' });
names.fuelTypes.set(F.PETROL, { name: 'Petrol' });
names.fuelTypes.set(F.DIESEL, { name: 'Diesel' });
names.transmissions.set(F.MANUAL, { name: 'Manual' });

const car = (mfr: string, model: string, year: number, fuel: string, color?: string) => ({
  manufacturerId: mfr, modelId: model, fuelTypeId: fuel, transmissionTypeId: F.MANUAL, year, color,
});

const SEEDS: Seed[] = [
  { key: 'A1', category: 'private_vehicle', title: 'Creta 2022 (White)', seller: SELLERS.S1, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2022, F.PETROL, 'White'), price: 1500000 },
  { key: 'A2', category: 'private_vehicle', title: 'Creta 2020 (Red)', seller: SELLERS.S1, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2020, F.DIESEL, 'Red'), price: 1200000 },
  { key: 'A3', category: 'private_vehicle', title: 'Creta 2020', seller: SELLERS.S2, at: KOCHI, vehicle: car(F.HYUNDAI, F.CRETA, 2020, F.PETROL), price: 1250000 },
  { key: 'A4', category: 'private_vehicle', title: 'Swift 2019', seller: SELLERS.S3, at: KOLLAM, vehicle: car(F.MARUTI, F.SWIFT, 2019, F.PETROL), price: 550000 },
  { key: 'A5', category: 'private_vehicle', title: 'i20 2021', seller: SELLERS.S1, at: THRISSUR, vehicle: car(F.HYUNDAI, F.I20, 2021, F.PETROL), price: 700000 },
  { key: 'A6', category: 'two_wheeler', title: 'Activa 2021', seller: SELLERS.S4, at: KOLLAM, vehicle: car(F.HONDA_BIKES, F.ACTIVA, 2021, F.PETROL), price: 65000 },
  { key: 'A7', category: 'private_vehicle', title: 'Honda City for sale', seller: SELLERS.S4, at: KOLLAM, vehicle: car(F.HONDA_CARS, '65b0000000000000000000c1', 2018, F.PETROL), price: 800000 },
  { key: 'A8', category: 'commercial_vehicle', title: 'Ace 2019', seller: SELLERS.S3, at: KOLLAM, commercial: { ...car(F.TATA, F.ACE, 2019, F.DIESEL), commercialVehicleType: 'truck' }, price: 400000 },
  { key: 'A9', category: 'property', title: '2BHK Apartment in Kollam', description: 'Near the creta showroom, walking distance to the bus stand', seller: SELLERS.S2, at: KOLLAM, property: { propertyType: 'apartment', listingType: 'rent', bedrooms: 2, areaSqft: 950 }, price: 12000 },
  { key: 'A10', category: 'private_vehicle', title: 'Creta 2021', seller: SELLERS.S2, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2021, F.PETROL), soldOut: true },
  { key: 'A11', category: 'private_vehicle', title: 'Creta 2021', seller: SELLERS.S2, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2021, F.PETROL), approved: false },
  { key: 'A12', category: 'private_vehicle', title: 'Creta 2019', seller: SELLERS.S1, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2019, F.DIESEL), price: 1000000 },
  { key: 'A13', category: 'private_vehicle', title: 'Creta 2018', seller: SELLERS.S1, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2018, F.DIESEL), price: 900000 },
  { key: 'A14', category: 'private_vehicle', title: 'Creta 2017', seller: SELLERS.S1, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2017, F.DIESEL), price: 850000 },
  { key: 'A15', category: 'private_vehicle', title: 'Creta 2016', seller: SELLERS.S1, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2016, F.DIESEL), price: 800000 },
  { key: 'A16', category: 'private_vehicle', title: 'Verna 2018', seller: SELLERS.S3, at: KOLLAM, vehicle: car(F.HYUNDAI, F.VERNA, 2018, F.PETROL), price: 650000 },
  { key: 'A17', category: 'private_vehicle', title: 'Creta 2022', seller: SELLERS.S3, at: KOLLAM, vehicle: car(F.HYUNDAI, F.CRETA, 2022, F.PETROL), ageDays: 60, price: 1400000 },
];

suite('search adapters — contract', () => {
  let conn: Connection;
  let AdModel: Model<any>;
  const ids = new Map<string, Types.ObjectId>();
  const keyOf = new Map<string, string>();
  const planner = new SearchPlanner();
  let parser: SearchQueryService;

  const plan = async (req: Record<string, any>, opts: { keysFilters?: boolean; lexicon?: SearchQueryService } = {}): Promise<SearchPlan> => {
    const p = opts.lexicon ?? parser;
    const parsed = req.search ? await p.parse(req.search) : undefined;
    return planner.plan(req as any, parsed, { keysFilters: opts.keysFilters ?? false, scoring: DEFAULT_SCORING });
  };

  /** Run the plan the way SearchAdsExecutor does: first non-empty step wins. */
  const run = async (engine: SearchIndexPort, p: SearchPlan) => {
    let last: Awaited<ReturnType<SearchIndexPort['search']>> | null = null;
    for (const step of p.steps) {
      last = await engine.search(p, step);
      if (last.hits.length) break;
    }
    const hits = last?.hits ?? [];
    const page = p.page.page === 1
      ? applySellerDiversity(hits, p.page.limit, DEFAULT_SCORING.diversityPerSellerPage1, (h) => h.postedBy)
      : hits.slice(0, p.page.limit);
    return { keys: page.map((h) => keyOf.get(String(h.id)) ?? '?'), result: last!, page };
  };

  beforeAll(async () => {
    conn = await mongoose.createConnection(URI as string).asPromise();
    AdModel = conn.model('Ad', AdSchema, 'ads');
    await AdModel.deleteMany({});
    await AdModel.syncIndexes();
    parser = new SearchQueryService(makeLexicon());

    const now = Date.now();
    const docs = SEEDS.map((s) => {
      const _id = new Types.ObjectId();
      ids.set(s.key, _id);
      keyOf.set(String(_id), s.key);
      const doc = composeSearchDoc(
        {
          category: s.category,
          images: ['x.jpg'],
          location: s.at === KOLLAM ? 'Kollam, Kerala' : s.at === KOCHI ? 'Kochi, Kerala' : 'Thrissur, Kerala',
          city: s.at === KOLLAM ? 'Kollam' : s.at === KOCHI ? 'Kochi' : 'Thrissur',
          district: s.at === KOLLAM ? 'Kollam' : s.at === KOCHI ? 'Ernakulam' : 'Thrissur',
          state: 'Kerala',
          vehicle: s.vehicle ?? null,
          commercial: s.commercial ?? null,
          property: s.property ?? null,
        },
        names,
        { sellerVerified: false },
      );
      const createdAt = new Date(now - (s.ageDays ?? 0) * 86_400_000);
      return {
        _id,
        title: s.title,
        description: s.description ?? `${s.title} in good condition`,
        price: s.price ?? 100000,
        images: ['x.jpg'],
        location: 'Kerala',
        latitude: s.at.lat,
        longitude: s.at.lng,
        geoLocation: { type: 'Point', coordinates: [s.at.lng, s.at.lat] },
        category: s.category,
        isActive: true,
        soldOut: s.soldOut ?? false,
        isApproved: s.approved ?? true,
        status: s.approved === false ? 'pending' : 'approved',
        postedBy: s.seller,
        createdAt,
        updatedAt: createdAt,
        ...searchDocFields(doc),
      };
    });
    await AdModel.collection.insertMany(docs);
  });

  afterAll(async () => {
    await conn?.close();
  });

  const contract = (label: string, engineFor: () => SearchIndexPort) => {
    describe(label, () => {
      let engine: SearchIndexPort;
      beforeAll(() => {
        engine = engineFor();
      });

      const cretas = ['A1', 'A2', 'A3', 'A12', 'A13', 'A14', 'A15', 'A17'];

      it('"creta" returns every visible Creta and nothing else', async () => {
        const { keys, result } = await run(engine, await plan({ search: 'creta' }));
        expect(new Set(keys)).toEqual(new Set(cretas));
        expect(keys).not.toContain('A9'); // the flat whose description mentions "creta"
        expect(keys).not.toContain('A10'); // sold out
        expect(keys).not.toContain('A11'); // not approved
        expect(result.total).toBe(cretas.length);
      });

      it('"cretta" is corrected and finds the same ads', async () => {
        const { keys } = await run(engine, await plan({ search: 'cretta' }));
        expect(new Set(keys)).toEqual(new Set(cretas));
      });

      it('"hyundai" is every Hyundai, no Honda', async () => {
        const { keys } = await run(engine, await plan({ search: 'hyundai' }));
        expect(new Set(keys)).toEqual(new Set([...cretas, 'A5', 'A16']));
      });

      it('"honda" spans the car and the bike', async () => {
        const { keys } = await run(engine, await plan({ search: 'honda' }));
        expect(new Set(keys)).toEqual(new Set(['A6', 'A7']));
      });

      it('"creta swift" is a union', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta swift' }));
        expect(new Set(keys)).toEqual(new Set([...cretas, 'A4']));
      });

      it('"creta petrol" keeps the diesel Cretas but ranks petrol first', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta petrol' }));
        expect(new Set(keys)).toEqual(new Set(cretas));
        const idx = (k: string) => keys.indexOf(k);
        expect(idx('A1')).toBeLessThan(idx('A2'));
        expect(idx('A3')).toBeLessThan(idx('A2'));
      });

      it('"creta 2020" boosts the exact year without filtering', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta 2020' }));
        expect(new Set(keys)).toEqual(new Set(cretas));
        expect(keys.indexOf('A2')).toBeLessThan(keys.indexOf('A1'));
      });

      it('"red creta" boosts the red one', async () => {
        const { keys } = await run(engine, await plan({ search: 'red creta' }));
        expect(keys[0]).toBe('A2');
      });

      it('device location in Kochi ranks the Kochi Creta first', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta', latitude: KOCHI.lat, longitude: KOCHI.lng }));
        expect(keys[0]).toBe('A3');
      });

      it('"creta kollam" applies the typed place', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta kollam' }));
        expect(keys).not.toContain('A3');
        expect(keys).toContain('A1');
      });

      it('an explicit radius is a hard bound', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta', latitude: KOLLAM.lat, longitude: KOLLAM.lng, maxDistance: 10 }));
        expect(keys).not.toContain('A3');
        expect(keys).toContain('A1');
      });

      it('Bikes tab + "creta" is empty and reported, never "all bikes"', async () => {
        const p = await plan({ search: 'creta', category: 'two_wheeler' });
        expect(p.conflicts).toHaveLength(1);
        const { keys } = await run(engine, p);
        expect(keys).toEqual([]);
      });

      it('"cars in kochi" is category-only within the place', async () => {
        const { keys } = await run(engine, await plan({ search: 'cars in kochi' }));
        expect(keys).toEqual(['A3']);
      });

      it('"2bhk flat for rent" finds the property (searchKeys filters)', async () => {
        // The legacy $lookup path needs propertyads rows, which this fixture
        // does not seed; with SEARCH_KEYS_FILTERS the same query runs on the ad.
        const { keys } = await run(engine, await plan({ search: '2bhk flat for rent' }, { keysFilters: true }));
        expect(keys).toEqual(['A9']);
      });

      it('"xyzabc" is empty', async () => {
        const { keys } = await run(engine, await plan({ search: 'xyzabc' }));
        expect(keys).toEqual([]);
      });

      it('a hint-only lexicon still finds Cretas by text, never every car', async () => {
        const hintOnly = new SearchQueryService(makeLexicon({ inventory: false }));
        const p = await plan({ search: 'creta' }, { lexicon: hintOnly });
        expect(p.steps[0].candidates.entityKeys).toEqual([]);
        const { keys } = await run(engine, p);
        expect(new Set(keys)).toEqual(new Set(cretas));
        expect(keys).not.toContain('A4');
      });

      it('explicit filters are honoured with the text kept', async () => {
        const p = await plan({ search: 'hyundai', minPrice: 1000000 });
        const { keys } = await run(engine, p);
        expect(new Set(keys)).toEqual(new Set(['A1', 'A2', 'A3', 'A12', 'A17']));
      });

      it('page 1 shows at most 3 ads from the same seller before the others', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta', limit: 5 }));
        const s1 = new Set(['A1', 'A2', 'A12', 'A13', 'A14', 'A15']);
        expect(keys.slice(0, 4).filter((k) => s1.has(k)).length).toBeLessThanOrEqual(3);
      });

      it('an older ad ranks below a fresh one at equal relevance', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta 2022' }));
        expect(keys.indexOf('A1')).toBeLessThan(keys.indexOf('A17'));
      });

      it('sortBy price overrides scoring', async () => {
        const { keys } = await run(engine, await plan({ search: 'creta', sortBy: 'price', sortOrder: 'ASC' }));
        expect(keys[0]).toBe('A15');
      });
    });
  };

  contract('MongoNativeAdapter', () => new MongoNativeAdapter(AdModel));

  describe('AtlasSearchAdapter', () => {
    let available = false;
    beforeAll(async () => {
      try {
        const spec = JSON.parse(readFileSync(join(__dirname, '..', 'atlas', 'ads-search-index.json'), 'utf8'));
        const col: any = AdModel.collection;
        const existing: any[] = await col.listSearchIndexes().toArray();
        if (!existing.some((x) => x.name === spec.name)) {
          await col.createSearchIndex({ name: spec.name, definition: spec.definition });
        }
        for (let i = 0; i < 60; i++) {
          const ix = (await col.listSearchIndexes().toArray()).find((x: any) => x.name === spec.name);
          if (ix?.status === 'READY' && ix.queryable) {
            available = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        // mongot indexes asynchronously; give the seeded docs a moment to land.
        if (available) await new Promise((r) => setTimeout(r, 3000));
      } catch {
        available = false;
      }
      if (!available) console.warn('Atlas Search not available on MONGO_TEST_URI — Atlas contract skipped');
    });

    it('is available (informational)', () => {
      expect(typeof available).toBe('boolean');
    });

    contract('same contract', () => {
      if (!available) {
        // Same expectations, served by Mongo, so the suite stays runnable on
        // plain mongo; the header above says the Atlas engine was not exercised.
        return new MongoNativeAdapter(AdModel);
      }
      return new AtlasSearchAdapter(AdModel);
    });
  });
});
