import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../shared/s3.service';
import {
  ApiErrorCode,
  ApiErrorException,
  FieldErrors,
  FieldValidationException,
} from '../common/errors/api-errors';
import {
  MAX_PHOTOS_ANY_CATEGORY,
  MEDIA_LIMITS,
  MEDIA_PRESIGN_TTL_SECONDS,
  MediaKind,
} from '../sell/sell.constants';
import {
  Media,
  MediaDocument,
  MediaKindEnum,
  MediaStatus,
} from './schemas/media.schema';
import { CreateMediaIntentDto } from './dto/create-media-intent.dto';

export interface MediaIntentResponse {
  mediaId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  key: string;
  expiresIn: number;
}

export interface MediaCompleteResponse {
  mediaId: string;
  url: string;
  status: MediaStatus;
  size: number;
  contentType: string;
}

export interface ResolvedAdMedia {
  imageUrls: string[];
  videoUrl?: string;
}

const FIELD_IMAGES = 'data.mediaIds';
const FIELD_VIDEO = 'data.videoMediaId';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    private readonly s3: S3Service,
  ) {}

  /** POST /v2/media/intents */
  async createIntent(
    ownerId: string,
    dto: CreateMediaIntentDto,
  ): Promise<MediaIntentResponse> {
    const fields: FieldErrors = {};
    const kind = dto?.kind as MediaKind;
    if (kind !== 'ad_image' && kind !== 'ad_video') {
      fields.kind = 'Choose image or video';
    }
    const size = Number(dto?.size);
    if (!Number.isInteger(size) || size < 1) {
      fields.size = 'Enter the file size in bytes';
    }
    const contentType = String(dto?.contentType ?? '')
      .toLowerCase()
      .trim();
    if (!contentType) {
      fields.contentType = 'Unsupported file type';
    }
    if (Object.keys(fields).length) throw new FieldValidationException(fields);

    const limits = MEDIA_LIMITS[kind];
    const ext = limits.contentTypes[contentType];
    if (!ext) {
      throw new ApiErrorException(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        ApiErrorCode.UNSUPPORTED_MEDIA_TYPE,
        `${contentType} is not supported for ${kind === 'ad_image' ? 'photos' : 'videos'}`,
      );
    }
    if (size > limits.maxBytes) {
      throw new ApiErrorException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ApiErrorCode.FILE_TOO_LARGE,
        `File is too large (max ${Math.round(limits.maxBytes / 1024 / 1024)} MB)`,
      );
    }

    const safeOwner = String(ownerId).replace(/[^A-Za-z0-9_-]/g, '');
    const key = `media/${safeOwner}/${uuidv4()}.${ext}`;
    const uploadUrl = await this.s3.getPresignedPutUrlForKey(
      key,
      contentType,
      MEDIA_PRESIGN_TTL_SECONDS,
    );

    const doc = await this.mediaModel.create({
      owner: new Types.ObjectId(ownerId),
      key,
      kind,
      contentType,
      declaredSize: size,
      status: MediaStatus.PENDING,
      adId: null,
    });

    return {
      mediaId: doc._id.toString(),
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      key,
      expiresIn: MEDIA_PRESIGN_TTL_SECONDS,
    };
  }

  /** POST /v2/media/:id/complete */
  async complete(
    ownerId: string,
    mediaId: string,
  ): Promise<MediaCompleteResponse> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw this.notFound();
    }
    const media = await this.mediaModel
      .findOne({ _id: new Types.ObjectId(mediaId) })
      .lean<Media>()
      .exec();
    if (!media || String(media.owner) !== String(ownerId)) {
      throw this.notFound();
    }

    if (
      media.status === MediaStatus.UPLOADED ||
      media.status === MediaStatus.ATTACHED
    ) {
      return this.toCompleteResponse(media); // idempotent retry
    }
    if (media.status === MediaStatus.REJECTED) {
      throw new ApiErrorException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.NOT_FOUND,
        'This upload was rejected. Please upload the file again.',
      );
    }

    const head = await this.s3.headObject(media.key);
    if (!head) {
      // Leave it pending: the PUT may still be in flight, the client can retry.
      throw new ApiErrorException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.BAD_REQUEST,
        'Upload not found. Finish uploading the file, then try again.',
      );
    }

    const limits = MEDIA_LIMITS[media.kind as MediaKind];
    const headType = head.contentType.split(';')[0].trim();
    if (head.contentLength > limits.maxBytes) {
      await this.reject(media, 'size');
      throw new ApiErrorException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ApiErrorCode.FILE_TOO_LARGE,
        `File is too large (max ${Math.round(limits.maxBytes / 1024 / 1024)} MB)`,
      );
    }
    if (!limits.contentTypes[headType] || headType !== media.contentType) {
      await this.reject(media, 'type');
      throw new ApiErrorException(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        ApiErrorCode.UNSUPPORTED_MEDIA_TYPE,
        'Unsupported file type',
      );
    }

    const url = this.s3.getPublicUrl(media.key);
    const updated = await this.mediaModel
      .findOneAndUpdate(
        { _id: media._id, status: MediaStatus.PENDING },
        {
          $set: {
            status: MediaStatus.UPLOADED,
            size: head.contentLength,
            url,
          },
        },
        { new: true },
      )
      .lean<Media>()
      .exec();

    if (!updated) {
      // A concurrent complete (or cleanup) won the race — report current state.
      const current = await this.mediaModel
        .findById(media._id)
        .lean<Media>()
        .exec();
      if (
        current &&
        (current.status === MediaStatus.UPLOADED ||
          current.status === MediaStatus.ATTACHED)
      ) {
        return this.toCompleteResponse(current);
      }
      throw this.notFound();
    }
    return this.toCompleteResponse(updated);
  }

  /** Own-bucket check for legacy `data.images` URLs. */
  isOwnBucketUrl(url: string): boolean {
    return this.s3.isOwnMediaUrl(url);
  }

  /**
   * Validation-only pass used before the create transaction so every media
   * problem is reported together with the other field errors.
   */
  async checkForAd(
    ownerId: string,
    mediaIds: string[] | undefined,
    videoMediaId?: string,
  ): Promise<FieldErrors> {
    const ids = this.collectIds(mediaIds, videoMediaId);
    if (!ids.length) return {};
    const docs = await this.mediaModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .lean<Media[]>()
      .exec();
    return this.evaluate(docs, ownerId, mediaIds ?? [], videoMediaId);
  }

  /**
   * Resolve + attach inside the create transaction. Order of `mediaIds` is
   * preserved (index 0 = cover). Throws FieldValidationException when any id is
   * missing, foreign, not yet uploaded, or already attached (the conditional
   * updateMany closes the race between two concurrent creates).
   */
  async attachForAd(params: {
    ownerId: string;
    adId: Types.ObjectId;
    mediaIds: string[] | undefined;
    videoMediaId?: string;
    session: ClientSession;
  }): Promise<ResolvedAdMedia> {
    const { ownerId, adId, mediaIds = [], videoMediaId, session } = params;
    const ids = this.collectIds(mediaIds, videoMediaId);
    if (!ids.length) return { imageUrls: [] };

    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const docs = await this.mediaModel
      .find({ _id: { $in: objectIds } })
      .session(session)
      .lean<Media[]>()
      .exec();

    const errors = this.evaluate(docs, ownerId, mediaIds, videoMediaId);
    if (Object.keys(errors).length) throw new FieldValidationException(errors);

    const res = await this.mediaModel.updateMany(
      {
        _id: { $in: objectIds },
        owner: new Types.ObjectId(ownerId),
        status: MediaStatus.UPLOADED,
        adId: null,
      },
      { $set: { status: MediaStatus.ATTACHED, adId } },
      { session },
    );
    if (res.modifiedCount !== objectIds.length) {
      throw new FieldValidationException({
        [FIELD_IMAGES]:
          'Some photos are no longer available. Remove them and try again',
      });
    }

    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return {
      imageUrls: mediaIds.map(
        (id) => byId.get(id)!.url || this.s3.getPublicUrl(byId.get(id)!.key),
      ),
      videoUrl: videoMediaId
        ? byId.get(videoMediaId)!.url ||
          this.s3.getPublicUrl(byId.get(videoMediaId)!.key)
        : undefined,
    };
  }

  /**
   * Edit support: media currently attached to `adId` whose URL is not in
   * `keepUrls` become `orphaned` (adId kept for audit). Returns their S3 keys
   * so the caller can delete the objects after commit.
   */
  async orphanForAd(params: {
    adId: Types.ObjectId;
    keepUrls: string[];
    session: ClientSession;
  }): Promise<string[]> {
    const { adId, keepUrls, session } = params;
    const keep = new Set(keepUrls.filter(Boolean));
    const attached = await this.mediaModel
      .find({ adId, status: MediaStatus.ATTACHED })
      .session(session)
      .lean<Media[]>()
      .exec();
    const gone = attached.filter(
      (m) => !keep.has(m.url || this.s3.getPublicUrl(m.key)),
    );
    if (!gone.length) return [];
    await this.mediaModel.updateMany(
      { _id: { $in: gone.map((m) => m._id) }, status: MediaStatus.ATTACHED },
      { $set: { status: MediaStatus.ORPHANED } },
      { session },
    );
    return gone.map((m) => m.key);
  }

  /** Best-effort S3 deletes (never throws). Returns how many succeeded. */
  async deleteObjectsBestEffort(keys: string[]): Promise<number> {
    let ok = 0;
    for (const key of keys) {
      try {
        await this.s3.deleteObject(key);
        ok++;
      } catch (error) {
        this.logger.warn(
          `Could not delete orphaned object ${key}: ${(error as Error)?.message}`,
        );
      }
    }
    return ok;
  }

  private collectIds(mediaIds?: string[], videoMediaId?: string): string[] {
    const all = [...(Array.isArray(mediaIds) ? mediaIds : [])];
    if (videoMediaId) all.push(videoMediaId);
    return all.filter(
      (id) => typeof id === 'string' && Types.ObjectId.isValid(id),
    );
  }

  private evaluate(
    docs: Media[],
    ownerId: string,
    mediaIds: string[],
    videoMediaId?: string,
  ): FieldErrors {
    const errors: FieldErrors = {};
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    const problem = (id: string, kind: MediaKindEnum): string | undefined => {
      const d = byId.get(id);
      if (!d || String(d.owner) !== String(ownerId)) return 'missing';
      if (d.kind !== kind) return 'kind';
      if (d.status === MediaStatus.PENDING) return 'pending';
      if (d.status !== MediaStatus.UPLOADED || d.adId) return 'unavailable';
      return undefined;
    };

    if (mediaIds.length > MAX_PHOTOS_ANY_CATEGORY) {
      errors[FIELD_IMAGES] = `Add up to ${MAX_PHOTOS_ANY_CATEGORY} photos`;
    } else if (new Set(mediaIds).size !== mediaIds.length) {
      errors[FIELD_IMAGES] = 'The same photo was added twice';
    } else {
      const issues = mediaIds.map((id) => problem(id, MediaKindEnum.AD_IMAGE));
      if (issues.includes('pending')) {
        errors[FIELD_IMAGES] = 'Some photos are still uploading';
      } else if (issues.some(Boolean)) {
        errors[FIELD_IMAGES] =
          'Some photos are no longer available. Remove them and try again';
      }
    }

    if (videoMediaId) {
      const issue = problem(videoMediaId, MediaKindEnum.AD_VIDEO);
      if (issue === 'pending') errors[FIELD_VIDEO] = 'Video is still uploading';
      else if (issue)
        errors[FIELD_VIDEO] = 'Video could not be attached. Upload it again';
    }
    return errors;
  }

  private async reject(media: Media, reason: string): Promise<void> {
    await this.mediaModel
      .updateOne(
        { _id: media._id, status: MediaStatus.PENDING },
        { $set: { status: MediaStatus.REJECTED } },
      )
      .exec();
    try {
      await this.s3.deleteObject(media.key);
    } catch (error) {
      this.logger.warn(
        `Could not delete rejected object ${media.key} (${reason}): ${(error as Error)?.message}`,
      );
    }
  }

  private notFound() {
    return new ApiErrorException(
      HttpStatus.NOT_FOUND,
      ApiErrorCode.NOT_FOUND,
      'Upload not found',
    );
  }

  private toCompleteResponse(media: Media): MediaCompleteResponse {
    return {
      mediaId: String(media._id),
      url: media.url || this.s3.getPublicUrl(media.key),
      status: media.status,
      size: Number(media.size ?? media.declaredSize),
      contentType: media.contentType,
    };
  }
}
