import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/redis.service';

@Injectable()
export class AdsCache {
  private static readonly PREFIX = 'ads:v2:';
  private static readonly TAG_LIST = 'ads:v2:tag:list';
  private static readonly TAG_BY_ID = (id: string) => `ads:v2:tag:byId:${id}`;

  constructor(private readonly redis: RedisService) {}

  makeKey(parts: Record<string, unknown>): string {
    const norm = Object.entries(parts)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('&');
    return `${AdsCache.PREFIX}${norm}`;
  }

  async setList(key: string, value: any, ttlSec: number): Promise<void> {
    await this.redis.cacheSet(key, value, ttlSec);
    await this.redis.sAdd(AdsCache.TAG_LIST, key);
  }

  async setById(
    id: string,
    userId: string | 'anonymous',
    value: any,
    ttlSec: number,
  ): Promise<void> {
    const key = `${AdsCache.PREFIX}getById:${id}:${userId}`;
    await this.redis.cacheSet(key, value, ttlSec);
    await this.redis.sAdd(AdsCache.TAG_BY_ID(id), key);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redis.cacheGet<T>(key);
  }

  async invalidateLists(): Promise<void> {
    const keys = await this.redis.sMembers(AdsCache.TAG_LIST);
    if (keys?.length) {
      await Promise.all(keys.map((k) => this.redis.cacheDel(k)));
    }
    await this.redis.del(AdsCache.TAG_LIST);
  }

  async invalidateById(id: string): Promise<void> {
    const tag = AdsCache.TAG_BY_ID(id);
    const keys = await this.redis.sMembers(tag);
    if (keys?.length) {
      await Promise.all(keys.map((k) => this.redis.cacheDel(k)));
    }
    await this.redis.del(tag);
  }

  async indexListKey(key: string): Promise<void> {
    await this.redis.sAdd(AdsCache.TAG_LIST, key);
  }
}
