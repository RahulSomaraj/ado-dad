import { Injectable, Logger, Optional } from '@nestjs/common';
import { PlanStep, SearchPlan } from '../planner/search-plan';
import { SearchEngineName, SearchIndexPort, SearchResult } from '../ports/search-index.port';
import { MongoNativeAdapter } from './mongo-native.adapter';
import { AtlasSearchAdapter } from './atlas-search.adapter';

/**
 * Picks the retrieval engine from SEARCH_ENGINE (`mongo` | `atlas`, default
 * `mongo`) and wraps Atlas so an index that is missing or still building falls
 * back to the Mongo adapter instead of failing the request. The fallback is
 * logged once a minute, not once a request.
 */
@Injectable()
export class SearchEngineFactory {
  private readonly logger = new Logger(SearchEngineFactory.name);
  private lastFallbackWarningAt = 0;

  constructor(
    private readonly mongo: MongoNativeAdapter,
    @Optional() private readonly atlas?: AtlasSearchAdapter,
  ) {}

  configuredName(): SearchEngineName {
    const raw = (process.env.SEARCH_ENGINE ?? 'mongo').toLowerCase();
    return raw === 'atlas' && this.atlas ? 'atlas' : 'mongo';
  }

  get(): SearchIndexPort {
    if (this.configuredName() !== 'atlas' || !this.atlas) return this.mongo;
    const atlas = this.atlas;
    const mongo = this.mongo;
    const warn = (err: unknown) => {
      const now = Date.now();
      if (now - this.lastFallbackWarningAt < 60_000) return;
      this.lastFallbackWarningAt = now;
      this.logger.error(
        `Atlas Search failed, serving from the Mongo adapter: ${(err as Error)?.message ?? err}. ` +
          'If the index is still building this is expected; otherwise run: npm run search:validate',
      );
    };
    return {
      name: 'atlas',
      async search(plan: SearchPlan, step: PlanStep): Promise<SearchResult> {
        // Explicit filters still on the legacy $lookup path (SEARCH_KEYS_FILTERS
        // off) cannot be expressed inside $search; Mongo handles those plans.
        if (AtlasSearchAdapter.needsLegacy(step)) return mongo.search(plan, step);
        try {
          return await atlas.search(plan, step);
        } catch (err) {
          if (!AtlasSearchAdapter.isRecoverable(err)) throw err;
          warn(err);
          return mongo.search(plan, step);
        }
      },
    };
  }
}
