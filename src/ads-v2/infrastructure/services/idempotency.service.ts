import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../../../shared/redis.service';
import {
  ApiErrorCode,
  ApiErrorException,
} from '../../../common/errors/api-errors';

export interface IdempotencyRecord<T = unknown> {
  state: 'in_progress' | 'done';
  bodyHash: string;
  response?: T;
  at: number;
}

export type IdempotencyBegin<T = unknown> =
  | { kind: 'started' }
  | { kind: 'replay'; response: T }
  /** Redis unavailable — caller proceeds without idempotency (fail open). */
  | { kind: 'unavailable' };

/** Idempotency-Key header: UUIDs and similar opaque tokens only. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  static isValidKey(key: string): boolean {
    return KEY_PATTERN.test(key);
  }

  /** Stable SHA-256 of a JSON payload (object keys sorted recursively). */
  static hashBody(body: unknown): string {
    return createHash('sha256').update(stableStringify(body)).digest('hex');
  }

  /**
   * Atomically claim `key` (SET NX EX). Outcomes:
   * - started: this request owns the key
   * - replay: same key + same body already completed → return stored response
   * - throws 409 IDEMPOTENCY_KEY_REUSED when the body differs
   * - throws 409 IDEMPOTENCY_IN_PROGRESS while the first request is running
   */
  async begin<T>(
    key: string,
    bodyHash: string,
    ttlSec: number,
  ): Promise<IdempotencyBegin<T>> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const record: IdempotencyRecord = {
        state: 'in_progress',
        bodyHash,
        at: Date.now(),
      };
      const claimed = await this.redis.setNx(
        key,
        JSON.stringify(record),
        ttlSec,
      );
      if (claimed === null) return { kind: 'unavailable' };
      if (claimed) return { kind: 'started' };

      const existing = await this.redis.cacheGet<IdempotencyRecord<T>>(key);
      if (!existing) continue; // expired between SET NX and GET — try once more

      if (existing.bodyHash !== bodyHash) {
        throw new ApiErrorException(
          HttpStatus.CONFLICT,
          ApiErrorCode.IDEMPOTENCY_KEY_REUSED,
          'This Idempotency-Key was already used for a different request',
        );
      }
      if (existing.state === 'done' && existing.response !== undefined) {
        return { kind: 'replay', response: existing.response };
      }
      throw new ApiErrorException(
        HttpStatus.CONFLICT,
        ApiErrorCode.IDEMPOTENCY_IN_PROGRESS,
        'This request is still being processed',
      );
    }
    return { kind: 'unavailable' };
  }

  /** Store the final response for replays (overwrites the in-progress marker). */
  async complete<T>(
    key: string,
    bodyHash: string,
    response: T,
    ttlSec: number,
  ): Promise<void> {
    const record: IdempotencyRecord<T> = {
      state: 'done',
      bodyHash,
      response,
      at: Date.now(),
    };
    await this.redis.cacheSet(key, record, ttlSec);
  }

  /** Release a claim after a failure before commit so the client can retry. */
  async release(key: string): Promise<void> {
    await this.redis.cacheDel(key);
  }

  // ---- legacy helpers (kept for external users of this service) ----
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

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}
