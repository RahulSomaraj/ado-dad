import { Types } from 'mongoose';
import { MediaService } from './media.service';
import { MediaStatus } from './schemas/media.schema';
import { ApiErrorCode, FieldValidationException } from '../common/errors/api-errors';

const OWNER = new Types.ObjectId().toString();
const q = (value: any) => ({
  lean: () => ({ exec: async () => value }),
  session: () => ({ lean: () => ({ exec: async () => value }) }),
});

function build(media: any) {
  const model: any = {
    create: jest.fn(async (doc: any) => ({ ...doc, _id: new Types.ObjectId() })),
    findOne: jest.fn(() => q(media)),
    findById: jest.fn(() => q(media)),
    find: jest.fn(() => q(media ? [media] : [])),
    findOneAndUpdate: jest.fn((_f: any, u: any) => q({ ...media, ...u.$set })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    updateMany: jest.fn(async () => ({ modifiedCount: 1 })),
  };
  const s3: any = {
    getPresignedPutUrlForKey: jest.fn(async () => 'https://signed'),
    headObject: jest.fn(),
    deleteObject: jest.fn(async () => undefined),
    getPublicUrl: (k: string) => `https://ado-dad.s3.ap-south-1.amazonaws.com/${k}`,
    isOwnMediaUrl: jest.fn(() => true),
  };
  return { svc: new MediaService(model, s3), model, s3 };
}

const pendingImage = () => ({
  _id: new Types.ObjectId(),
  owner: new Types.ObjectId(OWNER),
  key: `media/${OWNER}/abc.jpg`,
  kind: 'ad_image',
  contentType: 'image/jpeg',
  declaredSize: 1000,
  status: MediaStatus.PENDING,
  adId: null,
});

describe('MediaService', () => {
  describe('createIntent', () => {
    it('issues a presigned PUT on a server-chosen, owner-scoped key', async () => {
      const { svc, s3 } = build(null);
      const res = await svc.createIntent(OWNER, {
        kind: 'ad_image',
        contentType: 'image/jpeg',
        size: 312044,
      });
      expect(res.key).toMatch(new RegExp(`^media/${OWNER}/[0-9a-f-]{36}\\.jpg$`));
      expect(res.method).toBe('PUT');
      expect(res.headers).toEqual({ 'Content-Type': 'image/jpeg' });
      expect(res.expiresIn).toBe(900);
      expect(s3.getPresignedPutUrlForKey).toHaveBeenCalledWith(res.key, 'image/jpeg', 900);
    });

    it('415 for an unsupported type and 413 for an oversize declaration', async () => {
      const { svc } = build(null);
      await expect(
        svc.createIntent(OWNER, { kind: 'ad_image', contentType: 'image/gif', size: 10 }),
      ).rejects.toMatchObject({ code: ApiErrorCode.UNSUPPORTED_MEDIA_TYPE });
      await expect(
        svc.createIntent(OWNER, { kind: 'ad_video', contentType: 'video/mp4', size: 51 * 1024 * 1024 }),
      ).rejects.toMatchObject({ code: ApiErrorCode.FILE_TOO_LARGE });
    });
  });

  describe('complete', () => {
    it('marks uploaded with the real size and public URL', async () => {
      const m = pendingImage();
      const { svc, s3 } = build(m);
      s3.headObject.mockResolvedValue({ contentLength: 312044, contentType: 'image/jpeg' });
      const res = await svc.complete(OWNER, String(m._id));
      expect(res.status).toBe(MediaStatus.UPLOADED);
      expect(res.size).toBe(312044);
      expect(res.url).toBe(`https://ado-dad.s3.ap-south-1.amazonaws.com/${m.key}`);
    });

    it('oversize object → deleted, status rejected, 413', async () => {
      const m = pendingImage();
      const { svc, s3, model } = build(m);
      s3.headObject.mockResolvedValue({ contentLength: 11 * 1024 * 1024, contentType: 'image/jpeg' });
      await expect(svc.complete(OWNER, String(m._id))).rejects.toMatchObject({
        code: ApiErrorCode.FILE_TOO_LARGE,
      });
      expect(model.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: m._id }),
        { $set: { status: MediaStatus.REJECTED } },
      );
      expect(s3.deleteObject).toHaveBeenCalledWith(m.key);
    });

    it('wrong content type → rejected, 415', async () => {
      const m = pendingImage();
      const { svc, s3 } = build(m);
      s3.headObject.mockResolvedValue({ contentLength: 100, contentType: 'text/html' });
      await expect(svc.complete(OWNER, String(m._id))).rejects.toMatchObject({
        code: ApiErrorCode.UNSUPPORTED_MEDIA_TYPE,
      });
      expect(s3.deleteObject).toHaveBeenCalled();
    });

    it("404 for someone else's media", async () => {
      const m = pendingImage();
      const { svc } = build(m);
      await expect(
        svc.complete(new Types.ObjectId().toString(), String(m._id)),
      ).rejects.toMatchObject({ code: ApiErrorCode.NOT_FOUND });
    });
  });

  describe('orphanForAd', () => {
    it('orphans attached media no longer on the ad and returns their keys', async () => {
      const m = { ...pendingImage(), status: MediaStatus.ATTACHED, url: 'https://b/gone.jpg' };
      const { svc, model } = build(m);
      const keys = await svc.orphanForAd({
        adId: new Types.ObjectId(),
        keepUrls: ['https://b/kept.jpg'],
        session: {} as any,
      });
      expect(keys).toEqual([m.key]);
      expect(model.updateMany).toHaveBeenCalledWith(
        expect.anything(),
        { $set: { status: MediaStatus.ORPHANED } },
        expect.anything(),
      );
    });

    it('keeps media whose url is still used', async () => {
      const m = { ...pendingImage(), status: MediaStatus.ATTACHED, url: 'https://b/kept.jpg' };
      const { svc, model } = build(m);
      const keys = await svc.orphanForAd({
        adId: new Types.ObjectId(),
        keepUrls: ['https://b/kept.jpg'],
        session: {} as any,
      });
      expect(keys).toEqual([]);
      expect(model.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('attachForAd', () => {
    it('rejects media that is not uploaded yet', async () => {
      const m = pendingImage();
      const { svc } = build(m);
      await expect(
        svc.attachForAd({
          ownerId: OWNER,
          adId: new Types.ObjectId(),
          mediaIds: [String(m._id)],
          session: {} as any,
        }),
      ).rejects.toBeInstanceOf(FieldValidationException);
    });

    it('attaches uploaded media and preserves order', async () => {
      const m = { ...pendingImage(), status: MediaStatus.UPLOADED, url: 'https://b/x.jpg' };
      const { svc, model } = build(m);
      const res = await svc.attachForAd({
        ownerId: OWNER,
        adId: new Types.ObjectId(),
        mediaIds: [String(m._id)],
        session: {} as any,
      });
      expect(res.imageUrls).toEqual(['https://b/x.jpg']);
      expect(model.updateMany).toHaveBeenCalled();
    });
  });
});
