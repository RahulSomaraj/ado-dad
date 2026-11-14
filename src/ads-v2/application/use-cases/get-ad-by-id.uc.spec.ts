import { Types } from 'mongoose';
import { GetAdByIdUc, distanceKm } from './get-ad-by-id.uc';
import { appendPriceHistory } from '../../../ads/services/ads.service';
import { PRICE_HISTORY_LIMIT } from '../../../ads/schemas/ad.schema';

const OWNER_ID = new Types.ObjectId().toString();
const BUYER_ID = new Types.ObjectId().toString();
const AD_ID = new Types.ObjectId().toString();

function chain<T>(value: T) {
  const q: any = {
    populate: () => q,
    sort: () => q,
    limit: () => q,
    lean: () => Promise.resolve(value),
    then: (res: any, rej: any) => Promise.resolve(value).then(res, rej),
  };
  return q;
}

function makeAd(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(AD_ID),
    title: 'Swift VXi',
    description: 'desc',
    price: 485000,
    images: [],
    location: 'Adoor',
    category: 'private_vehicle',
    isActive: true,
    soldOut: false,
    isApproved: true,
    status: 'approved',
    postedBy: new Types.ObjectId(OWNER_ID),
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-10'),
    user: {
      _id: new Types.ObjectId(OWNER_ID),
      name: 'Anoop',
      isVerified: true,
    },
    viewCount: 3,
    ...overrides,
  };
}

function build(ad: any) {
  const pipelines: any[] = [];
  const room = {
    _id: new Types.ObjectId(),
    initiatorId: { _id: new Types.ObjectId(BUYER_ID), name: 'B', email: 'b@x' },
    adPosterId: { _id: new Types.ObjectId(OWNER_ID), name: 'O', email: 'o@x' },
    createdAt: new Date(),
  };
  const adRepo = {
    aggregate: jest.fn(async (p: any[]) => {
      pipelines.push(p);
      return ad ? [ad] : [];
    }),
    incrementViewCount: jest.fn(async () => 4),
  };
  const inventory = {
    getManufacturer: jest.fn(async () => null),
    getModel: jest.fn(async () => null),
    getVariant: jest.fn(async () => null),
    getFuelType: jest.fn(async () => null),
    getTransmissionType: jest.fn(async () => null),
  };
  const cache = {
    byIdKey: jest.fn(() => 'k'),
    get: jest.fn(async () => null),
    setById: jest.fn(async () => undefined),
  };
  const favoriteModel = {
    countDocuments: jest.fn(async () => 2),
    findOne: jest.fn(async () => null),
  };
  const chatRoomModel = {
    find: jest.fn(() => chain([room])),
    findOne: jest.fn(async () => null),
    countDocuments: jest.fn(async () => 37),
  };
  const messageModel = { findOne: jest.fn(() => chain(null)) };
  const uc = new GetAdByIdUc(
    adRepo as any,
    inventory as any,
    cache as any,
    favoriteModel as any,
    chatRoomModel as any,
    messageModel as any,
  );
  return { uc, pipelines };
}

describe('GetAdByIdUc', () => {
  it('does not filter out sold ads', async () => {
    const { uc, pipelines } = build(makeAd({ soldOut: true }));
    const res = await uc.exec({ adId: AD_ID });
    expect(res.soldOut).toBe(true);
    expect(pipelines[0][0].$match.soldOut).toBeUndefined();
  });

  it('returns exact chatsCount but hides chat rooms from non-owners', async () => {
    const { uc } = build(makeAd());
    const anon = await uc.exec({ adId: AD_ID });
    expect(anon.chatsCount).toBe(37);
    expect(anon.chats).toEqual([]);

    const buyer = await uc.exec({
      adId: AD_ID,
      userId: BUYER_ID,
      userType: 'NU',
    });
    expect(buyer.chats).toEqual([]);

    const owner = await uc.exec({
      adId: AD_ID,
      userId: OWNER_ID,
      userType: 'NU',
    });
    expect(owner.chats?.length).toBe(1);

    const admin = await uc.exec({
      adId: AD_ID,
      userId: BUYER_ID,
      userType: 'SA',
    });
    expect(admin.chats?.length).toBe(1);
  });

  it('exposes seller isVerified and price history', async () => {
    const changedAt = new Date('2026-09-12T10:00:00Z');
    const { uc } = build(
      makeAd({ priceHistory: [{ price: 500000, changedAt }] }),
    );
    const res = await uc.exec({ adId: AD_ID });
    expect(res.user?.isVerified).toBe(true);
    expect(res.previousPrice).toBe(500000);
    expect(res.priceChangedAt).toEqual(changedAt);
    expect(res.priceHistory).toHaveLength(1);
    expect(res.viewCount).toBe(4);
    expect(res.favoritesCount).toBe(2);
  });

  it('omits previousPrice when the price never changed', async () => {
    const { uc } = build(makeAd());
    const res = await uc.exec({ adId: AD_ID });
    expect(res.previousPrice).toBeUndefined();
    expect(res.priceHistory).toEqual([]);
  });

  it('adds distance only when the viewer and the ad both have a position', async () => {
    const withCoords = build(makeAd({ latitude: 9.1531, longitude: 76.7356 }));
    const near = await withCoords.uc.exec({
      adId: AD_ID,
      lat: 9.2648,
      lng: 76.787,
    });
    expect(near.distance).toBeGreaterThan(10);
    expect(near.distance).toBeLessThan(15);

    const noViewer = await withCoords.uc.exec({ adId: AD_ID });
    expect(noViewer.distance).toBeUndefined();

    const noCoords = build(makeAd());
    const fallback = await noCoords.uc.exec({
      adId: AD_ID,
      lat: 9.2648,
      lng: 76.787,
    });
    expect(fallback.hasCoordinates).toBe(false);
    expect(fallback.distance).toBeUndefined();
  });
});

describe('distanceKm', () => {
  it('returns null for missing input', () => {
    expect(
      distanceKm(undefined, 76, { latitude: 9, longitude: 76 }),
    ).toBeNull();
    expect(
      distanceKm(9, 76, { latitude: 9, longitude: 76, hasCoordinates: false }),
    ).toBeNull();
  });

  it('is zero for the same point', () => {
    expect(distanceKm(9.3, 76.9, { latitude: 9.3, longitude: 76.9 })).toBe(0);
  });
});

describe('appendPriceHistory', () => {
  it('appends the outgoing price with a timestamp', () => {
    const now = new Date('2026-09-15T00:00:00Z');
    expect(appendPriceHistory(undefined, 500000, now)).toEqual([
      { price: 500000, changedAt: now },
    ]);
  });

  it(`keeps only the last ${PRICE_HISTORY_LIMIT} entries`, () => {
    const history = Array.from({ length: PRICE_HISTORY_LIMIT }, (_, i) => ({
      price: i,
      changedAt: new Date(i),
    }));
    const next = appendPriceHistory(history, 999);
    expect(next).toHaveLength(PRICE_HISTORY_LIMIT);
    expect(next[0].price).toBe(1);
    expect(next[next.length - 1].price).toBe(999);
  });
});
