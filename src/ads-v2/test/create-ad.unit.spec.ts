import { Types } from 'mongoose';

// VehicleInventoryService pulls in ManufacturersService, which imports via the
// `src/…` absolute path the unit jest config cannot resolve. Every inventory
// call is stubbed in these tests, so replace the module.
jest.mock('../../vehicle-inventory/vehicle-inventory.service', () => ({
  VehicleInventoryService: class VehicleInventoryService {},
}));
import { CreateAdUc } from '../application/use-cases/create-ad.uc';
import { IdempotencyService } from '../infrastructure/services/idempotency.service';
import { AdCategoryV2, CreateAdV2Dto } from '../dto/create-ad-v2.dto';
import {
  ApiErrorCode,
  ApiErrorException,
  FieldValidationException,
} from '../../common/errors/api-errors';

/** In-memory stand-in for the RedisService methods idempotency uses. */
class FakeRedis {
  store = new Map<string, string>();
  down = false;
  async setNx(key: string, value: string) {
    if (this.down) return null;
    if (this.store.has(key)) return false;
    this.store.set(key, value);
    return true;
  }
  async cacheGet<T>(key: string): Promise<T | null> {
    const v = this.store.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }
  async cacheSet(key: string, value: unknown) {
    this.store.set(key, JSON.stringify(value));
  }
  async cacheDel(key: string) {
    this.store.delete(key);
  }
}

const OID = (n: number) => n.toString(16).padStart(24, 'b');
const USER = new Types.ObjectId().toString();

const dto = (): CreateAdV2Dto =>
  ({
    category: AdCategoryV2.PRIVATE_VEHICLE,
    data: {
      description: 'Well maintained, single owner, full service history.',
      price: 450000,
      location: 'Kakkanad, Kochi',
      mediaIds: [OID(1), OID(2)],
    },
    vehicle: {
      vehicleType: 'four_wheeler',
      manufacturerId: OID(10),
      modelId: OID(11),
      year: 2019,
      mileage: 0,
      transmissionTypeId: OID(12),
      fuelTypeId: OID(13),
      color: 'White',
    },
  }) as any;

function build(redis = new FakeRedis()) {
  const adId = new Types.ObjectId();
  const session = {
    withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()),
    endSession: jest.fn(),
  };
  const deps = {
    adRepo: {
      startSession: jest.fn(async () => session),
      create: jest.fn(async (doc: any) => ({ ...doc, _id: doc._id ?? adId })),
      aggregateOneByIdDetailed: jest.fn(async (id: any) => ({
        _id: id,
        title: 'Swift 2019 (White)',
        status: 'pending',
        category: 'private_vehicle',
      })),
    },
    propRepo: { createFromDto: jest.fn() },
    vehRepo: { createFromDto: jest.fn() },
    cvehRepo: { createFromDto: jest.fn() },
    inventory: {
      findInvalidRefs: jest.fn(async () => ({})),
      getModelName: jest.fn(async () => 'Swift'),
    },
    idem: new IdempotencyService(redis as any),
    cache: {
      invalidateLists: jest.fn(),
      invalidateById: jest.fn(),
      del: jest.fn(),
      makeKey: jest.fn(() => 'k'),
    },
    intent: { applyIfCommercial: jest.fn(async (d: any) => d) },
    outbox: { enqueue: jest.fn() },
    geocoding: { reverseGeocode: jest.fn() },
    hierarchy: { getLocationFilter: jest.fn() },
    media: {
      isOwnBucketUrl: jest.fn(() => true),
      checkForAd: jest.fn(async () => ({})),
      attachForAd: jest.fn(async () => ({
        imageUrls: ['https://b/1.jpg', 'https://b/2.jpg'],
      })),
    },
    sellConfig: { getActiveCommercialTypeNames: jest.fn(async () => new Set(['truck'])) },
    legacy: { invalidateLists: jest.fn() },
    searchDoc: {
      build: jest.fn(async () => ({
        searchText: 'stub',
        searchKeys: ['cat:stub'],
        imageCount: 0,
        sellerVerified: false,
        searchDocVersion: 1,
        searchDocBuiltAt: new Date(),
      })),
    },
  };
  const uc = new CreateAdUc(
    deps.adRepo as any,
    deps.propRepo as any,
    deps.vehRepo as any,
    deps.cvehRepo as any,
    deps.inventory as any,
    deps.idem,
    deps.cache as any,
    deps.intent as any,
    deps.outbox as any,
    deps.geocoding as any,
    deps.hierarchy as any,
    deps.media as any,
    deps.sellConfig as any,
    deps.legacy as any,
    deps.searchDoc as any,
  );
  return { uc, deps, redis, session };
}

describe('CreateAdUc', () => {
  it('creates inside withTransaction, attaches media in order and returns id + status', async () => {
    const { uc, deps, session } = build();
    const res: any = await uc.exec({ dto: dto(), userId: USER, userType: 'USER' });

    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalled();
    expect(deps.media.attachForAd).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: USER, mediaIds: [OID(1), OID(2)] }),
    );
    expect(deps.adRepo.create.mock.calls[0][0].images).toEqual([
      'https://b/1.jpg',
      'https://b/2.jpg',
    ]);
    expect(res.id).toBeDefined();
    expect(res.status).toBe('pending');
    expect(deps.cache.invalidateLists).toHaveBeenCalled();
    expect(deps.legacy.invalidateLists).toHaveBeenCalled();
  });

  it('uses the provided title instead of generating one', async () => {
    const { uc, deps } = build();
    const d: any = dto();
    d.data.title = '2019 Maruti Suzuki Swift VXi';
    await uc.exec({ dto: d, userId: USER, userType: 'USER' });
    expect(deps.adRepo.create.mock.calls[0][0].title).toBe('2019 Maruti Suzuki Swift VXi');
    expect(deps.inventory.getModelName).not.toHaveBeenCalled();
  });

  it('returns all field errors together as FieldValidationException', async () => {
    const { uc, deps } = build();
    const d: any = dto();
    delete d.vehicle.color;
    d.data.price = 0;
    deps.inventory.findInvalidRefs.mockResolvedValueOnce({ 'vehicle.modelId': 'Choose a model' } as any);

    await expect(uc.exec({ dto: d, userId: USER, userType: 'USER' })).rejects.toMatchObject({
      fields: expect.objectContaining({
        'vehicle.color': 'Choose a colour',
        'data.price': expect.any(String),
        'vehicle.modelId': 'Choose a model',
      }),
    });
    expect(deps.adRepo.startSession).not.toHaveBeenCalled();
  });

  it('a post-commit failure never turns a committed create into an error', async () => {
    const { uc, deps } = build();
    deps.outbox.enqueue.mockRejectedValueOnce(new Error('mongo blip'));
    deps.cache.invalidateLists.mockRejectedValueOnce(new Error('redis blip'));
    deps.adRepo.aggregateOneByIdDetailed.mockRejectedValueOnce(new Error('read blip'));
    const res: any = await uc.exec({ dto: dto(), userId: USER, userType: 'USER' });
    expect(res.id).toBeDefined();
    expect(res.status).toBe('pending');
  });

  describe('idempotency', () => {
    const KEY = '1f3b8f48-1d7a-4c63-a8a2-7e5d9f5a3d6e';

    it('replays the stored 201 for the same key + same body', async () => {
      const { uc, deps } = build();
      const first: any = await uc.exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY });
      const second: any = await uc.exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY });
      expect(second).toEqual(first);
      expect(deps.adRepo.create).toHaveBeenCalledTimes(1);
    });

    it('scopes keys per user', async () => {
      const { uc, deps } = build();
      await uc.exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY });
      await uc.exec({ dto: dto(), userId: new Types.ObjectId().toString(), userType: 'USER', idempotencyKey: KEY });
      expect(deps.adRepo.create).toHaveBeenCalledTimes(2);
    });

    it('409 IDEMPOTENCY_IN_PROGRESS while the first request is running', async () => {
      const { uc, redis } = build();
      const hash = IdempotencyService.hashBody(dto());
      redis.store.set(
        `ads:v2:create:${USER}:${KEY}`,
        JSON.stringify({ state: 'in_progress', bodyHash: hash, at: Date.now() }),
      );
      const err = await uc
        .exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY })
        .catch((e) => e);
      expect(err).toBeInstanceOf(ApiErrorException);
      expect(err.code).toBe(ApiErrorCode.IDEMPOTENCY_IN_PROGRESS);
      expect(err.getStatus()).toBe(409);
    });

    it('409 IDEMPOTENCY_KEY_REUSED for the same key with a different body', async () => {
      const { uc } = build();
      await uc.exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY });
      const changed: any = dto();
      changed.data.price = 460000;
      const err = await uc
        .exec({ dto: changed, userId: USER, userType: 'USER', idempotencyKey: KEY })
        .catch((e) => e);
      expect(err.code).toBe(ApiErrorCode.IDEMPOTENCY_KEY_REUSED);
    });

    it('releases the key when the create fails before commit so the client can retry', async () => {
      const { uc, redis } = build();
      const bad: any = dto();
      delete bad.vehicle.color;
      await expect(
        uc.exec({ dto: bad, userId: USER, userType: 'USER', idempotencyKey: KEY }),
      ).rejects.toBeInstanceOf(FieldValidationException);
      expect(redis.store.size).toBe(0);

      const ok: any = await uc.exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY });
      expect(ok.id).toBeDefined();
    });

    it('fails open (no idempotency) when Redis is unavailable', async () => {
      const redis = new FakeRedis();
      redis.down = true;
      const { uc, deps } = build(redis);
      await uc.exec({ dto: dto(), userId: USER, userType: 'USER', idempotencyKey: KEY });
      expect(deps.adRepo.create).toHaveBeenCalledTimes(1);
    });
  });
});
