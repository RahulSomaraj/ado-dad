import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controllers
import { AdsController } from './controllers/ads.controller';
import { LookupController } from './controllers/lookup.controller';

// Services
import { AdsService } from './services/ads.service';
import { DataValidationService } from './services/data-validation.service';
import { LookupService } from './services/lookup.service';
import { AdsSeedService } from './seed/seed-ads-data';
import { CommercialVehicleDetectionService } from './services/commercial-vehicle-detection.service';

// Schemas
import { Ad, AdSchema } from './schemas/ad.schema';
import { PropertyAd, PropertyAdSchema } from './schemas/property-ad.schema';
import { VehicleAd, VehicleAdSchema } from './schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdSchema,
} from './schemas/commercial-vehicle-ad.schema';
import {
  PropertyType,
  PropertyTypeSchema,
} from './schemas/property-type.schema';

// Related schemas for comprehensive ad details
import { Favorite, FavoriteSchema } from '../favorites/schemas/schema.favorite';

// External modules and services
import { VehicleInventoryModule } from '../vehicle-inventory/vehicle-inventory.module';
import { S3Service } from '../shared/s3.service';
import { RedisService } from '../shared/redis.service';

@Module({
  imports: [
    // Database schemas
    MongooseModule.forFeature([
      { name: Ad.name, schema: AdSchema },
      { name: PropertyAd.name, schema: PropertyAdSchema },
      { name: VehicleAd.name, schema: VehicleAdSchema },
      { name: CommercialVehicleAd.name, schema: CommercialVehicleAdSchema },
      { name: PropertyType.name, schema: PropertyTypeSchema },
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
    // External modules
    VehicleInventoryModule,
  ],
  controllers: [AdsController, LookupController],
  providers: [
    AdsService,
    DataValidationService,
    LookupService,
    AdsSeedService,
    CommercialVehicleDetectionService,
    S3Service,
    RedisService,
  ],
  exports: [AdsService, LookupService, MongooseModule],
})
export class AdsModule {}
