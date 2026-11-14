import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import { SearchPlan } from '../planner/search-plan';
import { SearchResult } from '../ports/search-index.port';
import { SearchClick, SearchEvent } from './search-event.schema';

export interface RecordSearchInput {
  eventId: Types.ObjectId;
  plan: SearchPlan;
  result: SearchResult | null;
  resultCount: number;
  latencyMs: number;
  fallbackUsed: boolean;
  relaxations: string[];
  cacheHit: boolean;
  userId?: string;
  sessionId?: string;
  explicitFilterKeys: string[];
  geoBucket?: string;
}

/**
 * Search event logging (audit §C.11). Everything here is fire-and-forget:
 * a failure to log is a warning, never a failed search.
 */
@Injectable()
export class SearchEventsService {
  private readonly logger = new Logger(SearchEventsService.name);
  private readonly enabled = (process.env.SEARCH_EVENTS_ENABLED ?? 'true').toLowerCase() !== 'false';
  private readonly salt = process.env.SEARCH_EVENTS_SALT ?? 'adodad-search';

  constructor(
    @InjectModel(SearchEvent.name) private readonly eventModel: Model<any>,
    @InjectModel(SearchClick.name) private readonly clickModel: Model<any>,
  ) {}

  newEventId(): Types.ObjectId {
    return new Types.ObjectId();
  }

  hashUser(userId?: string): string | undefined {
    if (!userId) return undefined;
    return createHash('sha256').update(`${this.salt}:${userId}`).digest('hex').slice(0, 24);
  }

  /** Never awaited by the request path. */
  record(input: RecordSearchInput): void {
    if (!this.enabled) return;
    const { plan, result } = input;
    const parsed = plan.parsed;
    const doc = {
      _id: input.eventId,
      ts: new Date(),
      sessionId: input.sessionId?.slice(0, 64),
      userHash: this.hashUser(input.userId),
      engine: result?.engine ?? 'none',
      original: plan.original.slice(0, 200),
      normalized: (parsed?.normalized ?? plan.original.toLowerCase()).slice(0, 200),
      strength: parsed?.strength ?? 'none',
      strategy: plan.strategy,
      parsedSummary: parsed
        ? {
            category: parsed.category,
            brands: parsed.manufacturerNames,
            models: parsed.modelNames,
            corrections: parsed.corrections.map((c) => ({ from: c.from, to: c.to })),
            location: parsed.location?.slug,
          }
        : undefined,
      explicitFilterKeys: input.explicitFilterKeys.length ? input.explicitFilterKeys : undefined,
      geoBucket: input.geoBucket,
      resultCount: input.resultCount,
      total: result?.total,
      totalCapped: result?.totalCapped,
      nearestKm: result?.nearestKm,
      latencyMs: input.latencyMs,
      fallbackUsed: input.fallbackUsed,
      relaxations: input.relaxations.length ? input.relaxations : undefined,
      hadConflict: plan.conflicts.length > 0 ? true : undefined,
      page: plan.page.page,
      cacheHit: input.cacheHit || undefined,
    };
    this.eventModel
      .create(doc)
      .catch((err: Error) => this.logger.warn(`search event not recorded: ${err.message}`));
  }

  async recordClick(input: {
    eventId: string;
    adId: string;
    position: number;
    action: 'view' | 'contact' | 'favorite';
  }): Promise<boolean> {
    if (!this.enabled) return false;
    if (!Types.ObjectId.isValid(input.eventId) || !Types.ObjectId.isValid(input.adId)) return false;
    await this.clickModel.create({
      ts: new Date(),
      eventId: new Types.ObjectId(input.eventId),
      adId: new Types.ObjectId(input.adId),
      position: Math.max(0, Math.floor(input.position)),
      action: input.action,
    });
    return true;
  }
}
