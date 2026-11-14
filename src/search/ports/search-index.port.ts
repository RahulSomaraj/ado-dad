import { Types } from 'mongoose';
import { PlanStep, SearchPlan } from '../planner/search-plan';

export type SearchEngineName = 'mongo' | 'atlas';

export interface SearchHit {
  id: Types.ObjectId;
  score: number;
  distanceKm?: number | null;
  /** Seller id, for page-1 diversity. */
  postedBy?: string;
  /** True when the ad matched through a structured entity key. */
  structuredHit?: boolean;
}

export interface SearchResult {
  hits: SearchHit[];
  /** Present when the plan asked for a total. Capped; see `totalCapped`. */
  total?: number;
  totalCapped?: boolean;
  /** Smallest distance among the returned hits, when an origin was set. */
  nearestKm?: number;
  engine: SearchEngineName;
  queryMs: number;
}

/**
 * What every retrieval engine implements. The use case runs `plan.steps` in
 * order through one of these and stops at the first non-empty result; it then
 * hydrates the ids itself, so adapters return ids and scores, never documents.
 */
export interface SearchIndexPort {
  readonly name: SearchEngineName;
  search(plan: SearchPlan, step: PlanStep): Promise<SearchResult>;
}
