import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: RedisClientType;
  private readonly keyPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix =
      this.configService.get('REDIS_CONFIG.keyPrefix') || 'adodad:';
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const redisConfig = this.configService.get('REDIS_CONFIG');

      this.redisClient = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          connectTimeout: redisConfig.connectTimeout,
        },
        password: redisConfig.password || undefined,
        database: redisConfig.db,
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis Client Connected');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis Client Ready');
      });

      this.redisClient.on('end', () => {
        this.logger.log('Redis Client Disconnected');
      });

      await this.redisClient.connect();
      this.logger.log(
        `Connected to Redis at ${redisConfig.host}:${redisConfig.port}`,
      );
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  private async disconnect() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  // Basic Redis Operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      if (ttl) {
        await this.redisClient.setEx(fullKey, ttl, value);
      } else {
        await this.redisClient.set(fullKey, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.get(fullKey);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.del(fullKey);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.redisClient.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.expire(fullKey, ttl);
    } catch (error) {
      this.logger.error(`Error setting expiry for key ${key}:`, error);
      throw error;
    }
  }

  // JSON Operations
  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      const jsonValue = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setEx(fullKey, ttl, jsonValue);
      } else {
        await this.redisClient.set(fullKey, jsonValue);
      }
    } catch (error) {
      this.logger.error(`Error setting JSON key ${key}:`, error);
      throw error;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.redisClient.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting JSON key ${key}:`, error);
      throw error;
    }
  }

  // Hash Operations
  async hSet(key: string, field: string, value: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.hSet(fullKey, field, value);
    } catch (error) {
      this.logger.error(
        `Error setting hash field ${field} for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      const fullKey = this.getKey(key);
      const fieldStr = field || '';
      const result = await this.redisClient.hGet(fullKey, fieldStr);
      return result ?? null;
    } catch (error) {
      this.logger.error(
        `Error getting hash field ${field} for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.hGetAll(fullKey);
    } catch (error) {
      this.logger.error(`Error getting all hash fields for key ${key}:`, error);
      throw error;
    }
  }

  async hDel(key: string, field: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.hDel(fullKey, field);
    } catch (error) {
      this.logger.error(
        `Error deleting hash field ${field} for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  // List Operations
  async lPush(key: string, value: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.lPush(fullKey, value);
    } catch (error) {
      this.logger.error(`Error pushing to list ${key}:`, error);
      throw error;
    }
  }

  async rPush(key: string, value: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.rPush(fullKey, value);
    } catch (error) {
      this.logger.error(`Error pushing to list ${key}:`, error);
      throw error;
    }
  }

  async lPop(key: string): Promise<string | null> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.lPop(fullKey);
    } catch (error) {
      this.logger.error(`Error popping from list ${key}:`, error);
      throw error;
    }
  }

  async rPop(key: string): Promise<string | null> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.rPop(fullKey);
    } catch (error) {
      this.logger.error(`Error popping from list ${key}:`, error);
      throw error;
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.lRange(fullKey, start, stop);
    } catch (error) {
      this.logger.error(`Error getting range from list ${key}:`, error);
      throw error;
    }
  }

  // Set Operations
  async sAdd(key: string, member: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.sAdd(fullKey, member);
    } catch (error) {
      this.logger.error(`Error adding member to set ${key}:`, error);
      throw error;
    }
  }

  async sRem(key: string, member: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.sRem(fullKey, member);
    } catch (error) {
      this.logger.error(`Error removing member from set ${key}:`, error);
      throw error;
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.sMembers(fullKey);
    } catch (error) {
      this.logger.error(`Error getting members from set ${key}:`, error);
      throw error;
    }
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      return await this.redisClient.sIsMember(fullKey, member);
    } catch (error) {
      this.logger.error(`Error checking membership in set ${key}:`, error);
      throw error;
    }
  }

  // Cache Operations
  async cacheGet<T>(key: string): Promise<T | null> {
    try {
      return await this.getJson<T>(key);
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async cacheSet<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      await this.setJson(key, value, ttl);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  async cacheDel(key: string): Promise<void> {
    try {
      await this.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  // Session Operations
  async setSession(
    sessionId: string,
    data: any,
    ttl: number = 86400,
  ): Promise<void> {
    try {
      await this.setJson(`session:${sessionId}`, data, ttl);
    } catch (error) {
      this.logger.error(`Error setting session ${sessionId}:`, error);
      throw error;
    }
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    try {
      return await this.getJson<T>(`session:${sessionId}`);
    } catch (error) {
      this.logger.error(`Error getting session ${sessionId}:`, error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.del(`session:${sessionId}`);
    } catch (error) {
      this.logger.error(`Error deleting session ${sessionId}:`, error);
    }
  }

  // Rate Limiting
  async incrementRateLimit(key: string, ttl: number = 60): Promise<number> {
    try {
      const fullKey = this.getKey(`rate_limit:${key}`);
      const current = await this.redisClient.incr(fullKey);

      if (current === 1) {
        await this.redisClient.expire(fullKey, ttl);
      }

      return current;
    } catch (error) {
      this.logger.error(`Error incrementing rate limit for ${key}:`, error);
      throw error;
    }
  }

  // Health Check
  async ping(): Promise<string> {
    try {
      return await this.redisClient.ping();
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      throw error;
    }
  }

  // Get keys by pattern
  async keys(pattern: string): Promise<string[]> {
    try {
      const fullPattern = this.getKey(pattern);
      return await this.redisClient.keys(fullPattern);
    } catch (error) {
      this.logger.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  // Flush Database (use with caution)
  async flushDb(): Promise<void> {
    try {
      await this.redisClient.flushDb();
      this.logger.warn('Redis database flushed');
    } catch (error) {
      this.logger.error('Error flushing Redis database:', error);
      throw error;
    }
  }
}
