import { Types } from 'mongoose';

// VehicleInventoryService imports `src/…` paths the unit jest config cannot
// resolve; every inventory call is stubbed here.
jest.mock('../../vehicle-inventory/vehicle-inventory.service', () => ({
  VehicleInventoryService: class VehicleInventoryService {},
}));

import { UpdateAdUc } from '../application/use-cases/update-ad.uc';
import { GetAdForEditUc } from '../application/use-cases/get-ad-for-edit.uc';
import { ApiErrorCode, FieldValidationException } from '../../common/errors/api-errors';

const OWNER = new Types.ObjectId().toString();
const OID = (n: number) => n.toString(16).padStart(24, 'c');
const IMG1 = 'https://ado-dad.s3.ap-south-1.amazonaws.com/media/u/1.jpg';
const IMG2 = 'https://ado-dad.s3.ap-south-1.amazonaws.com/media/u/2.jpg';
const VIDEO = 'https://ado-dad.s3.ap-south-1.amazonaws.com/media/u/v.mp4';

const storedAd = () => ({
  _id: new Types.ObjectId(),
  postedBy: new Types.ObjectId(OWNER),
  category: 'private_vehicle',
  status: 'approved',
  isApproved: true,
  title: 'Swift 2019 (White)',
  description: 'Well maintained, single owner, full service history.',
  price: 500000,
  location: 'Kakkanad, Kochi',
  images: [IMG1, IMG2],
  link: VIDEO,
  priceHistory: [],
});

const body = (over: Record<string, any> = {}) =>
  ({
    category: 'private_vehicle',
    data: {
      description: 'Well maintained, single owner, full service history.',
      price: 500000,
      location: 'Kakkanad, Kochi',
      media: [{ url: IMG2 }, { url: IMG1 }],
      videoUrl: VIDEO,
      ...over,
    },
    vehicle: {
      vehicleType: 'four_wheeler',
      manufacturerId: OID(10),
      modelId: OID(11),
      year: 2019,
      mileage: 42000,
      transmissionTypeId: OID(12),
      fuelTypeId: OID(13),
      color: 'White',
    },
  }) as any;

function build(ad = storedAd()) {
  const session = {
    withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()),
    endSession: jest.fn(),
  };
  const deps = {
    adRepo: {
      findById: jest.fn(async () => ad),
      startSession: jest.fn(async () => session),
      updateOne: jest.fn(async (..._args: any[]) => ({ modifiedCount: 1 })),
      aggregateOneByIdDetailed: jest.fn(async (id: any) => ({ _id: id, status: ad.status })),
    },
    propRepo: { updateByAdId: jest.fn(async () => ({})), createFromDto: jest.fn() },
    vehRepo: { updateByAdId: jest.fn(async () => ({})), createFromDto: jest.fn() },
    cvehRepo: { updateByAdId: jest.fn(async () => ({})), createFromDto: jest.fn() },
    inventory: {
      findInvalidRefs: jest.fn(async () => ({})),
      getModelName: jest.fn(async () => 'Swift'),
    },
    cache: { invalidateById: jest.fn(), invalidateLists: jest.fn() },
    intent: { applyIfCommercial: jest.fn(async (d: any) => d) },
    geocoding: { reverseGeocode: jest.fn() },
    hierarchy: { getLocationFilter: jest.fn() },
    media: {
      checkForAd: jest.fn(async () => ({})),
      attachForAd: jest.fn(async () => ({ imageUrls: [] as string[], videoUrl: undefined as string | undefined })),
      orphanForAd: jest.fn(async () => [] as string[]),
      deleteObjectsBestEffort: jest.fn(async () => 0),
    },
    sellConfig: { getActiveCommercialTypeNames: jest.fn(async () => new Set(['truck'])) },
    legacy: { invalidateById: jest.fn(), invalidateLists: jest.fn() },
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
  const uc = new UpdateAdUc(
    deps.adRepo as any,
    deps.propRepo as any,
    deps.vehRepo as any,
    deps.cvehRepo as any,
    deps.inventory as any,
    deps.cache as any,
    deps.intent as any,
    deps.geocoding as any,
    deps.hierarchy as any,
    deps.media as any,
    deps.sellConfig as any,
    deps.legacy as any,
    deps.searchDoc as any,
  );
  return { uc, deps, ad, session };
}

const run = (uc: UpdateAdUc, ad: any, dto: any, userId = OWNER, userType = 'NU') =>
  uc.exec({ adId: String(ad._id), dto, userId, userType });

describe('UpdateAdUc', () => {
  it('404 for someone else; super admin may edit', async () => {
    const { uc, ad } = build();
    await expect(run(uc, ad, body(), new Types.ObjectId().toString())).rejects.toMatchObject({
      code: ApiErrorCode.NOT_FOUND,
    });
    await expect(run(uc, ad, body(), new Types.ObjectId().toString(), 'SA')).resolves.toBeDefined();
  });

  it('reorders existing photos, keeps status/approval, invalidates caches', async () => {
    const { uc, deps, ad } = build();
    await run(uc, ad, body());
    const update = deps.adRepo.updateOne.mock.calls[0][1] as any;
    expect(update.$set.images).toEqual([IMG2, IMG1]);
    expect(update.$set.link).toBe(VIDEO);
    expect(update.$set.status).toBeUndefined();
    expect(update.$set.isApproved).toBeUndefined();
    expect(update.$set.priceHistory).toBeUndefined();
    expect(deps.media.orphanForAd).toHaveBeenCalledWith(
      expect.objectContaining({ keepUrls: [IMG2, IMG1, VIDEO] }),
    );
    expect(deps.cache.invalidateById).toHaveBeenCalledWith(String(ad._id));
    expect(deps.legacy.invalidateById).toHaveBeenCalledWith(String(ad._id));
    expect(deps.legacy.invalidateLists).toHaveBeenCalled();
  });

  it('422 on data.media for a url that does not belong to the ad', async () => {
    const { uc, ad, deps } = build();
    const err = await run(uc, ad, body({ media: [{ url: 'https://ado-dad.s3.ap-south-1.amazonaws.com/media/x/other.jpg' }] })).catch((e) => e);
    expect(err).toBeInstanceOf(FieldValidationException);
    expect(err.fields['data.media']).toBeDefined();
    expect(deps.adRepo.startSession).not.toHaveBeenCalled();
  });

  it('422 on category when the category changes', async () => {
    const { uc, ad } = build();
    const dto = body();
    dto.category = 'two_wheeler';
    const err = await run(uc, ad, dto).catch((e) => e);
    expect(err.fields.category).toBeDefined();
  });

  it('appends price history when the price changes', async () => {
    const { uc, deps, ad } = build();
    await run(uc, ad, body({ price: 480000 }));
    const update = deps.adRepo.updateOne.mock.calls[0][1] as any;
    expect(update.$set.price).toBe(480000);
    expect(update.$set.priceHistory).toEqual([
      expect.objectContaining({ price: 500000 }),
    ]);
  });

  it('removeVideo unsets link and orphans the old video media', async () => {
    const { uc, deps, ad } = build();
    await run(uc, ad, body({ removeVideo: true, videoUrl: undefined }));
    const update = deps.adRepo.updateOne.mock.calls[0][1] as any;
    expect(update.$unset.link).toBe('');
    expect(deps.media.orphanForAd).toHaveBeenCalledWith(
      expect.objectContaining({ keepUrls: [IMG2, IMG1] }),
    );
  });

  it('attaches new mediaIds in position', async () => {
    const { uc, deps, ad } = build();
    deps.media.attachForAd.mockResolvedValueOnce({ imageUrls: ['https://new/3.jpg'], videoUrl: undefined });
    await run(uc, ad, body({ media: [{ url: IMG1 }, { mediaId: OID(99) }] }));
    expect(deps.media.attachForAd).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER, mediaIds: [OID(99)] }),
    );
    expect((deps.adRepo.updateOne.mock.calls[0][1] as any).$set.images).toEqual([IMG1, 'https://new/3.jpg']);
  });

  it('422 when videoUrl is not the current video', async () => {
    const { uc, ad } = build();
    const err = await run(uc, ad, body({ videoUrl: 'https://evil/x.mp4' })).catch((e) => e);
    expect(err.fields['data.videoUrl']).toBeDefined();
  });
});

describe('GetAdForEditUc', () => {
  it('returns the create body shape with names for the owner, 404 otherwise', async () => {
    const ad = storedAd();
    const adRepo: any = { findById: jest.fn(async () => ad) };
    const vehRepo: any = {
      findByAdId: jest.fn(async () => ({
        vehicleType: 'four_wheeler',
        manufacturerId: new Types.ObjectId(OID(10)),
        modelId: new Types.ObjectId(OID(11)),
        year: 2019,
        mileage: 0,
        fuelTypeId: new Types.ObjectId(OID(13)),
        color: 'White',
        ownerCount: 1,
      })),
    };
    const inventory: any = {
      getManufacturer: jest.fn(async () => ({ displayName: 'Maruti Suzuki' })),
      getModel: jest.fn(async () => ({ name: 'Swift' })),
      getVariant: jest.fn(),
    };
    const uc = new GetAdForEditUc(adRepo, {} as any, vehRepo, {} as any, inventory);
    const res: any = await uc.exec({ adId: String(ad._id), userId: OWNER });
    expect(res.data.media).toEqual([{ url: IMG1 }, { url: IMG2 }]);
    expect(res.data.videoUrl).toBe(VIDEO);
    expect(res.vehicle).toMatchObject({
      manufacturerId: OID(10),
      mileage: 0,
      transmissionTypeId: null,
      ownerCount: 1,
      manufacturerName: 'Maruti Suzuki',
      modelName: 'Swift',
      variantName: null,
    });
    expect(res.property).toBeUndefined();
    await expect(
      uc.exec({ adId: String(ad._id), userId: new Types.ObjectId().toString() }),
    ).rejects.toMatchObject({ code: ApiErrorCode.NOT_FOUND });
  });
});
