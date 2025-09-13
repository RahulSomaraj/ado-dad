import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdsV2Controller } from './ads.v2.controller';
import { CreateAdUc } from './application/use-cases/create-ad.uc';
import { ListAdsUc } from './application/use-cases/list-ads.uc';

// Repositories
import { AdRepository } from './infrastructure/repos/ad.repo';
import { PropertyAdRepository } from './infrastructure/repos/property-ad.repo';
import { VehicleAdRepository } from './infrastructure/repos/vehicle-ad.repo';
import { CommercialVehicleAdRepository } from './infrastructure/repos/commercial-vehicle-ad.repo';

// Services
import { IdempotencyService } from './infrastructure/services/idempotency.service';
import { AdsCache } from './infrastructure/services/ads-cache';
import { VehicleInventoryGateway } from './infrastructure/services/vehicle-inventory.gateway';
import { CommercialIntentService } from './infrastructure/services/commercial-intent.service';
import { OutboxService } from './infrastructure/services/outbox.service';

// External services
import { RedisService } from '../shared/redis.service';
import { VehicleInventoryModule } from '../vehicle-inventory/vehicle-inventory.module';
import { CommercialVehicleDetectionService } from '../ads/services/commercial-vehicle-detection.service';

// Schemas
import { Ad, AdSchema } from '../ads/schemas/ad.schema';
import {
  PropertyAd,
  PropertyAdSchema,
} from '../ads/schemas/property-ad.schema';
import { VehicleAd, VehicleAdSchema } from '../ads/schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdSchema,
} from '../ads/schemas/commercial-vehicle-ad.schema';

// Outbox schema
const OutboxSchema = {
  event: { type: String, required: true },
  payload: { type: Object, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  retryCount: { type: Number, default: 0 },
  error: { type: String },
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ad.name, schema: AdSchema },
      { name: PropertyAd.name, schema: PropertyAdSchema },
      { name: VehicleAd.name, schema: VehicleAdSchema },
      { name: CommercialVehicleAd.name, schema: CommercialVehicleAdSchema },
      { name: 'Outbox', schema: OutboxSchema },
    ]),
    VehicleInventoryModule,
  ],
  controllers: [AdsV2Controller],
  providers: [
    // Use cases
    CreateAdUc,
    ListAdsUc,

    // Repositories
    AdRepository,
    PropertyAdRepository,
    VehicleAdRepository,
    CommercialVehicleAdRepository,

    // Services
    IdempotencyService,
    AdsCache,
    VehicleInventoryGateway,
    CommercialIntentService,
    OutboxService,

    // External services
    RedisService,
    CommercialVehicleDetectionService,
  ],
  exports: [
    // Export use cases for potential external use
    CreateAdUc,
    ListAdsUc,

    // Export services for potential external use
    IdempotencyService,
    AdsCache,
    VehicleInventoryGateway,
    OutboxService,
  ],
})
export class AdsV2Module {}
