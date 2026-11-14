import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import { Ad } from '../../ads/schemas/ad.schema';
import { SearchSeedService } from '../services/search-seed.service';
import { InventoryLexiconMaterializer } from '../services/inventory-lexicon.materializer';
import { LexiconService } from '../services/lexicon.service';
import { SearchQueryService } from '../services/search-query.service';
import {
  describeTarget,
  formatBanner,
  guardWrites,
  parseFlags,
  withResolvedDatabase,
} from '../../common/database/db-safety.util';
import { applyLocalDnsWorkaround } from '../../common/database/dns-bootstrap';

/**
 * Builds the search lexicon.
 *
 * Writes ONLY to `search_terms` and `location_terms`, both of which belong
 * entirely to the search feature and did not exist before this work. It never
 * touches `ads` — `--derive` reads ad locations but writes nothing back to them.
 *
 * Even so it goes through the write fuse, because the blast radius of a script
 * is not obvious from its name, and the habit of "every write script is guarded"
 * is worth more than the exemption.
 *
 *   npm run search:seed                          # dry run — prints what it would do
 *   npm run search:seed -- --apply               # local / UAT
 *   ALLOW_PROD_WRITE=yes npm run search:seed -- --apply --prod --confirm <db>
 *   npm run search:seed -- --derive              # also mine city/district names off ads
 *   npm run search:seed -- --probe "cars in kollam"
 */
// Must run before the Nest context is created: Mongoose connects during
// module initialisation, and the SRV lookup happens there.
applyLocalDnsWorkaround();

async function bootstrap() {
  const flags = parseFlags();
  const script = 'search:seed';
  const derive = flags.values.derive === true;
  const probe = typeof flags.values.probe === 'string' ? flags.values.probe : undefined;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // The URI may carry no database name; the live connection always knows it,
    // and --confirm has to be matchable against something real.
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const target = withResolvedDatabase(describeTarget(), adModel.db?.name);

    const guard = guardWrites({
      script,
      apply: flags.apply,
      confirm: flags.confirm,
      prodFlag: flags.prodFlag,
      target,
    });
    console.log(formatBanner(script, guard));
    console.log('Writes are limited to: search_terms, location_terms');
    console.log('The `ads` collection is never modified by this script.\n');

    const seeder = app.get(SearchSeedService);
    const materializer = app.get(InventoryLexiconMaterializer);
    const lexicon = app.get(LexiconService);

    const parser = app.get(SearchQueryService);

    if (!guard.writesEnabled) {
      console.log('DRY RUN — counting what would be written, then stopping.\n');
      const plan = seeder.planSeed();
      console.log('📚 Curated lexicon');
      console.log(`   term rows      : ${plan.termCount}`);
      console.log(`   location rows  : ${plan.locationCount}`);
      if (plan.collisions.length > 0) {
        console.log(`   ⚠ collisions   : ${plan.collisions.join(', ')}`);
      }
      console.log('\n🚗 Inventory lexicon: would rebuild from vehicle-inventory.');

      // Probe against whatever is ALREADY seeded. This is the fastest way to
      // answer "is the lexicon live and parsing correctly?" without writing
      // anything — which is exactly what you need when search still looks wrong.
      console.log('\n📊 Lexicon currently loaded:', JSON.stringify(lexicon.stats()));
      await runProbes(parser, probe);
      if (lexicon.isEmpty) {
        console.log(
          '\n⚠  The lexicon is EMPTY — nothing has been seeded yet, so the parser',
        );
        console.log('   cannot classify anything and search falls back to raw text.');
      }

      console.log('\nRe-run with --apply to write.');
      return;
    }

    const seedReport = await seeder.seedAll();
    console.log('📚 Curated lexicon');
    console.log(`   terms upserted     : ${seedReport.termsUpserted}`);
    console.log(`   terms removed      : ${seedReport.termsRemoved}`);
    console.log(`   locations upserted : ${seedReport.locationsUpserted}`);
    console.log(`   locations removed  : ${seedReport.locationsRemoved}`);
    if (seedReport.collisions.length > 0) {
      console.log(`   ⚠️  collisions      : ${seedReport.collisions.join(', ')}`);
    }

    const inventory = await materializer.materialize();
    console.log('\n🚗 Inventory lexicon');
    console.log(`   manufacturers : ${inventory.manufacturers}`);
    console.log(`   models        : ${inventory.models}`);
    console.log(`   variants      : ${inventory.variants}`);
    console.log(`   fuel types    : ${inventory.fuelTypes}`);
    console.log(`   transmissions : ${inventory.transmissions}`);
    console.log(`   stale removed : ${inventory.removed}`);

    if (derive) {
      const derived = await seeder.deriveLocationsFromAds(adModel);
      console.log(`\n📍 Derived ${derived} gazetteer rows from live ad locations (read-only on ads)`);
      console.log('   Review these and promote the good ones into gazetteer.seed.ts.');
    }

    console.log('\n📊 Lexicon state:', JSON.stringify(lexicon.stats()));

    // Probe the parser so a bad seed is visible now rather than at the next search.
    await runProbes(parser, probe);

    console.log('\n✅ Search lexicon ready.');
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

/** Parse a few queries and print the result. Read-only. */
async function runProbes(
  parser: SearchQueryService,
  probe?: string,
): Promise<void> {
  const probes = probe
    ? [probe]
    : ['cars', 'bikes in kollam', 'property in kollam', '2bhk flat for rent quilon'];
  console.log('\n🧪 Parse probes');
  for (const q of probes) {
    const parsed = await parser.parse(q);
    console.log(
      `   "${q}" → category=${parsed.category ?? '-'} ` +
        `location=${parsed.location?.slug ?? '-'} ` +
        `propertyTypes=${parsed.propertyTypes?.join('|') ?? '-'} ` +
        `listing=${parsed.listingType ?? '-'} ` +
        `bedrooms=${parsed.bedrooms ?? '-'} ` +
        `freeText="${parsed.freeText}" conf=${parsed.confidence} ` +
        `filter=${parsed.applyAsFilter}`,
    );
  }
  console.log(
    `\n   SEARCH_PARSER_ENABLED=${process.env.SEARCH_PARSER_ENABLED ?? '(unset)'}` +
      ' — the API ignores all of the above unless this is "true".',
  );
}

bootstrap();
