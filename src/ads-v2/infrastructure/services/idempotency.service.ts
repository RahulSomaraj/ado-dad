import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/redis.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    return this.redis.cacheGet<T>(key);
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    await this.redis.cacheSet(key, value, ttlSec);
  }

  async delete(key: string): Promise<void> {
    await this.redis.cacheDel(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.cacheGet(key);
    return result !== null;
  }
}
