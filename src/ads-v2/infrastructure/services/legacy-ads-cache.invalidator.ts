import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../shared/redis.service';

/**
 * Clears the v1 AdsService list caches after a v2 create, without importing
 * AdsModule (AdsService.invalidateAdCache is private and AdsModule already
 * depends on ads-v2 pieces).
 *
 * v1 keys look like `ads:<k=v&…>` with a `scope="findAll" | "getUserAds" |
 * "getAllAdsForAdmin"` part (AdsService.key). RedisService.keys() returns
 * keys WITH the Redis key prefix while cacheDel() adds it again, so the
 * prefix is stripped here before deleting.
 */
@Injectable()
export class LegacyAdsCacheInvalidator {
  private readonly logger = new Logger(LegacyAdsCacheInvalidator.name);
  private static readonly SCOPES = ['findAll', 'getUserAds', 'getAllAdsForAdmin'];

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  /** v1 detail cache entries: `ads:getById:<id>:<userId|anonymous>`. */
  async invalidateById(adId: string): Promise<void> {
    const prefix: string =
      this.config.get<string>('REDIS_CONFIG.keyPrefix') || 'adodad:';
    try {
      const keys = await this.redis.keys(`ads:getById:${adId}:*`);
      await Promise.all(
        keys.map((k) =>
          this.redis.cacheDel(k.startsWith(prefix) ? k.slice(prefix.length) : k),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `v1 getById cache invalidation failed: ${(error as Error)?.message}`,
      );
    }
  }

  async invalidateLists(): Promise<void> {
    const prefix: string =
      this.config.get<string>('REDIS_CONFIG.keyPrefix') || 'adodad:';
    for (const scope of LegacyAdsCacheInvalidator.SCOPES) {
      try {
        const keys = await this.redis.keys(`ads:*scope="${scope}"*`);
        await Promise.all(
          keys.map((k) =>
            this.redis.cacheDel(k.startsWith(prefix) ? k.slice(prefix.length) : k),
          ),
        );
      } catch (error) {
        this.logger.warn(
          `v1 ${scope} cache invalidation failed: ${(error as Error)?.message}`,
        );
      }
    }
  }
}
