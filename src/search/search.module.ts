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

import { LexiconService } from './services/lexicon.service';
import { SearchQueryService } from './services/search-query.service';
import { SearchSeedService } from './services/search-seed.service';
import { InventoryLexiconMaterializer } from './services/inventory-lexicon.materializer';

/**
 * Query understanding. Deliberately has no controller yet — phase S4 injects
 * `SearchQueryService` into the ads list use case, and phase S5 adds the
 * suggest/facets endpoints.
 *
 * Nothing in here reads or writes ads, so importing it cannot change existing
 * list behaviour.
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
    ]),
  ],
  providers: [
    LexiconService,
    SearchQueryService,
    SearchSeedService,
    InventoryLexiconMaterializer,
  ],
  exports: [LexiconService, SearchQueryService, SearchSeedService, InventoryLexiconMaterializer],
})
export class SearchModule {}
