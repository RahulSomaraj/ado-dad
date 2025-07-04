import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controllers
import { AdsController } from './controllers/ads.controller';
import { LookupController } from './controllers/lookup.controller';

// Services
import { AdsService } from './services/ads.service';
import { LookupService } from './services/lookup.service';
import { AdsSeedService } from './seed/seed-ads-data';

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

// External modules and services
import { VehicleInventoryModule } from '../vehicle-inventory/vehicle-inventory.module';
import { S3Service } from '../shared/s3.service';

@Module({
  imports: [
    // Database schemas
    MongooseModule.forFeature([
      { name: Ad.name, schema: AdSchema },
      { name: PropertyAd.name, schema: PropertyAdSchema },
      { name: VehicleAd.name, schema: VehicleAdSchema },
      { name: CommercialVehicleAd.name, schema: CommercialVehicleAdSchema },
      { name: PropertyType.name, schema: PropertyTypeSchema },
    ]),
    // External modules
    VehicleInventoryModule,
  ],
  controllers: [AdsController, LookupController],
  providers: [AdsService, LookupService, AdsSeedService, S3Service],
  exports: [AdsService, LookupService, MongooseModule],
})
export class AdsModule {}
