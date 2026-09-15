import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../shared/redis.service';
import { ChatError, ChatErrorCode } from '../chat-errors';

export interface RateRule {
  max: number;
  windowSec: number;
}

export const CHAT_RATE_RULES = {
  sendMessage: { max: 20, windowSec: 10 },
  createRoom: { max: 10, windowSec: 60 },
  upload: { max: 30, windowSec: 60 },
  markRead: { max: 60, windowSec: 60 },
} satisfies Record<string, RateRule>;

/**
 * Per-user fixed-window limiter. Redis-backed so it holds across PM2 instances;
 * falls back to a bounded in-memory map when Redis is unavailable.
 */
@Injectable()
export class ChatRateLimiterService {
  private readonly logger = new Logger(ChatRateLimiterService.name);
  private readonly memory = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = 0;

  constructor(private readonly redis: RedisService) {}

  async consume(action: keyof typeof CHAT_RATE_RULES, userId: string): Promise<void> {
    const rule: RateRule = CHAT_RATE_RULES[action];
    const key = `chat:${action}:${userId}`;
    let count: number;
    try {
      count = await this.redis.incrementRateLimit(key, rule.windowSec);
    } catch {
      count = this.consumeMemory(key, rule);
    }
    if (count > rule.max) {
      throw new ChatError(ChatErrorCode.RATE_LIMITED, 'You are sending too fast. Please wait a moment.');
    }
  }

  private consumeMemory(key: string, rule: RateRule): number {
    const now = Date.now();
    if (now - this.lastSweep > 60_000) {
      for (const [k, v] of this.memory) if (v.resetAt <= now) this.memory.delete(k);
      this.lastSweep = now;
    }
    const entry = this.memory.get(key);
    if (!entry || entry.resetAt <= now) {
      this.memory.set(key, { count: 1, resetAt: now + rule.windowSec * 1000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}
