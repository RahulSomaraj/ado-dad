import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdsController } from './controllers/ads.controller';
import { LookupController } from './controllers/lookup.controller';
import { AdsService } from './services/ads.service';
import { LookupService } from './services/lookup.service';
import { AdsSeedService } from './seed/seed-ads-data';
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
import { VehicleInventoryModule } from '../vehicle-inventory/vehicle-inventory.module';
import { S3Service } from '../shared/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ad.name, schema: AdSchema },
      { name: PropertyAd.name, schema: PropertyAdSchema },
      { name: VehicleAd.name, schema: VehicleAdSchema },
      { name: CommercialVehicleAd.name, schema: CommercialVehicleAdSchema },
      { name: PropertyType.name, schema: PropertyTypeSchema },
    ]),
    VehicleInventoryModule,
  ],
  controllers: [AdsController, LookupController],
  providers: [AdsService, LookupService, AdsSeedService, S3Service],
  exports: [AdsService, LookupService],
})
export class AdsModule {}
