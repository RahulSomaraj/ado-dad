import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SearchTerm, SearchTermSchema } from './schemas/search-term.schema';
import { LocationTerm, LocationTermSchema } from './schemas/location-term.schema';
import { Ad, AdSchema } from '../ads/schemas/ad.schema';
import {
  Manufacturer,
  ManufacturerSchema,
} from '../vehicle-inventory/schemas/manufacturer.schema';
import {
  VehicleModel,
  VehicleModelSchema,
} from '../vehicle-inventory/schemas/vehicle-model.schema';
import {
  VehicleVariant,
  VehicleVariantSchema,
} from '../vehicle-inventory/schemas/vehicle-variant.schema';
import { FuelType, FuelTypeSchema } from '../vehicle-inventory/schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeSchema,
} from '../vehicle-inventory/schemas/transmission-type.schema';

import { VehicleAd, VehicleAdSchema } from '../ads/schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdSchema,
} from '../ads/schemas/commercial-vehicle-ad.schema';
import { PropertyAd, PropertyAdSchema } from '../ads/schemas/property-ad.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { LexiconService } from './services/lexicon.service';
import { SearchQueryService } from './services/search-query.service';
import { SearchSeedService } from './services/search-seed.service';
import { InventoryLexiconMaterializer } from './services/inventory-lexicon.materializer';
import { AdSearchDocBuilder } from './services/ad-search-doc.builder';
import { SearchDocSyncService } from './services/search-doc-sync.service';
import { SearchPlanner } from './planner/search-planner';
import { MongoNativeAdapter } from './adapters/mongo-native.adapter';
import { AtlasSearchAdapter } from './adapters/atlas-search.adapter';
import { SearchEngineFactory } from './adapters/search-engine.factory';
import { SearchEventsService } from './events/search-events.service';
import {
  SearchClick,
  SearchClickSchema,
  SearchEvent,
  SearchEventSchema,
} from './events/search-event.schema';

/**
 * Query understanding. Deliberately has no controller yet — phase S4 injects
 * `SearchQueryService` into the ads list use case, and phase S5 adds the
 * suggest/facets endpoints.
 *
 * SearchDocSyncService and AdSearchDocBuilder write the denormalised search
 * document onto ads; nothing here changes list behaviour on its own.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SearchTerm.name, schema: SearchTermSchema },
      { name: LocationTerm.name, schema: LocationTermSchema },
      { name: Ad.name, schema: AdSchema },
      { name: Manufacturer.name, schema: ManufacturerSchema },
      { name: VehicleModel.name, schema: VehicleModelSchema },
      { name: VehicleVariant.name, schema: VehicleVariantSchema },
      { name: FuelType.name, schema: FuelTypeSchema },
      { name: TransmissionType.name, schema: TransmissionTypeSchema },
      { name: VehicleAd.name, schema: VehicleAdSchema },
      { name: CommercialVehicleAd.name, schema: CommercialVehicleAdSchema },
      { name: PropertyAd.name, schema: PropertyAdSchema },
      { name: User.name, schema: UserSchema },
      { name: SearchEvent.name, schema: SearchEventSchema },
      { name: SearchClick.name, schema: SearchClickSchema },
    ]),
  ],
  providers: [
    LexiconService,
    SearchQueryService,
    SearchSeedService,
    InventoryLexiconMaterializer,
    AdSearchDocBuilder,
    SearchDocSyncService,
    SearchPlanner,
    MongoNativeAdapter,
    AtlasSearchAdapter,
    SearchEngineFactory,
    SearchEventsService,
  ],
  exports: [
    LexiconService,
    SearchQueryService,
    SearchSeedService,
    InventoryLexiconMaterializer,
    AdSearchDocBuilder,
    SearchDocSyncService,
    SearchPlanner,
    MongoNativeAdapter,
    AtlasSearchAdapter,
    SearchEngineFactory,
    SearchEventsService,
  ],
})
export class SearchModule {}
