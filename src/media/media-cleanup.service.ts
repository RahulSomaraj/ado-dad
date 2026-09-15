import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../shared/redis.service';
import { S3Service } from '../shared/s3.service';
import { Media, MediaDocument, MediaStatus } from './schemas/media.schema';

const HOUR_MS = 60 * 60 * 1000;
export const MEDIA_ORPHAN_AGE_MS = 72 * HOUR_MS;
const LOCK_KEY = 'media:cleanup:lock';
const LOCK_TTL_SEC = 55 * 60; // shorter than the interval so the next tick can re-acquire
const BATCH = 500;

/**
 * Hourly sweep of abandoned uploads: media still `pending`/`uploaded` with no
 * ad after 72 h are marked `rejected` and their S3 objects deleted.
 *
 * Every PM2 instance starts the timer; a Redis SET NX lock makes only one of
 * them do the work per hour. If Redis is down the sweep is skipped (never run
 * unlocked on N instances at once).
 */
@Injectable()
export class MediaCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaCleanupService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    private readonly redis: RedisService,
    private readonly s3: S3Service,
  ) {}

  onModuleInit() {
    if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') return;
    if (process.env.MEDIA_CLEANUP_DISABLED === 'true') return;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, HOUR_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Returns the number of media rejected, or null when the lock was not acquired. */
  async runOnce(now: Date = new Date()): Promise<number | null> {
    if (this.running) return null;
    const token = `${process.pid}:${now.getTime()}`;
    const acquired = await this.redis.setNx(LOCK_KEY, token, LOCK_TTL_SEC);
    if (acquired !== true) return null;

    this.running = true;
    let rejected = 0;
    try {
      const cutoff = new Date(now.getTime() - MEDIA_ORPHAN_AGE_MS);
      const stale = await this.mediaModel
        .find({
          status: { $in: [MediaStatus.PENDING, MediaStatus.UPLOADED] },
          adId: null,
          createdAt: { $lt: cutoff },
        })
        .select('_id key')
        .limit(BATCH)
        .lean<Pick<Media, '_id' | 'key'>[]>()
        .exec();

      for (const m of stale) {
        // Mark first (conditionally), so an ad attaching this media at the same
        // moment either wins (and we skip) or fails its own conditional update.
        const res = await this.mediaModel.updateOne(
          {
            _id: m._id,
            status: { $in: [MediaStatus.PENDING, MediaStatus.UPLOADED] },
            adId: null,
          },
          { $set: { status: MediaStatus.REJECTED } },
        );
        if (res.modifiedCount !== 1) continue;
        rejected++;
        try {
          await this.s3.deleteObject(m.key);
        } catch (error) {
          this.logger.warn(
            `Orphan media ${String(m._id)} marked rejected but S3 delete failed: ${(error as Error)?.message}`,
          );
        }
      }
      if (rejected) this.logger.log(`Rejected ${rejected} orphaned media`);
      return rejected;
    } catch (error) {
      this.logger.error(
        `Media cleanup failed: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      return rejected;
    } finally {
      this.running = false;
    }
  }
}
