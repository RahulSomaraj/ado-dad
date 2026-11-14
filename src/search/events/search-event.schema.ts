import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SearchEventDocument = SearchEvent & Document;
export type SearchClickDocument = SearchClick & Document;

/** Days an event is kept. Tier-2 reports read the last 4–6 weeks. */
export const SEARCH_EVENT_TTL_DAYS = 180;

/**
 * One row per search request (audit §C.11). Written fire-and-forget after the
 * response is built, never on the request path. No PII: the user id is
 * hashed, the session id is whatever anonymous id the app sends, and there is
 * no phone or email anywhere in here.
 */
@Schema({ collection: 'search_events', timestamps: false })
export class SearchEvent {
  _id: Types.ObjectId;

  @Prop({ type: Date, required: true })
  ts: Date;

  @Prop({ type: String, required: false })
  sessionId?: string;

  @Prop({ type: String, required: false })
  userHash?: string;

  @Prop({ type: String, required: true })
  engine: string;

  @Prop({ type: String, required: true })
  original: string;

  @Prop({ type: String, required: true })
  normalized: string;

  @Prop({ type: String, required: true })
  strength: string;

  @Prop({ type: String, required: true })
  strategy: string;

  @Prop({ type: Object, required: false })
  parsedSummary?: {
    category?: string;
    brands?: string[];
    models?: string[];
    corrections?: { from: string; to: string }[];
    location?: string;
  };

  @Prop({ type: [String], required: false, default: undefined })
  explicitFilterKeys?: string[];

  @Prop({ type: String, required: false })
  geoBucket?: string;

  @Prop({ type: Number, required: true })
  resultCount: number;

  @Prop({ type: Number, required: false })
  total?: number;

  @Prop({ type: Boolean, required: false })
  totalCapped?: boolean;

  @Prop({ type: Number, required: false })
  nearestKm?: number;

  @Prop({ type: Number, required: true })
  latencyMs: number;

  @Prop({ type: Boolean, required: true, default: false })
  fallbackUsed: boolean;

  @Prop({ type: [String], required: false, default: undefined })
  relaxations?: string[];

  @Prop({ type: Boolean, required: false })
  hadConflict?: boolean;

  @Prop({ type: Number, required: true, default: 1 })
  page: number;

  @Prop({ type: Boolean, required: false })
  cacheHit?: boolean;
}

export const SearchEventSchema = SchemaFactory.createForClass(SearchEvent);
SearchEventSchema.index({ ts: 1 }, { expireAfterSeconds: SEARCH_EVENT_TTL_DAYS * 86400, background: true });
SearchEventSchema.index({ normalized: 1, ts: -1 }, { background: true });
SearchEventSchema.index({ resultCount: 1, ts: -1 }, { background: true });

/** A click, contact or favourite on a search result, posted by the app. */
@Schema({ collection: 'search_clicks', timestamps: false })
export class SearchClick {
  @Prop({ type: Date, required: true })
  ts: Date;

  @Prop({ type: Types.ObjectId, required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  adId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  position: number;

  @Prop({ type: String, required: true, enum: ['view', 'contact', 'favorite'] })
  action: 'view' | 'contact' | 'favorite';
}

export const SearchClickSchema = SchemaFactory.createForClass(SearchClick);
SearchClickSchema.index({ ts: 1 }, { expireAfterSeconds: SEARCH_EVENT_TTL_DAYS * 86400, background: true });
SearchClickSchema.index({ eventId: 1 }, { background: true });
SearchClickSchema.index({ adId: 1, ts: -1 }, { background: true });
