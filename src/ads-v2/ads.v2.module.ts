import { getJwtSecret } from '../common/jwt-secret.util';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdsV2Controller } from './ads.v2.controller';
import { LocationConfigController } from './controllers/location-config.controller';
import { CreateAdUc } from './application/use-cases/create-ad.uc';
import { ListAdsUc } from './application/use-cases/list-ads.uc';
import { GetAdByIdUc } from './application/use-cases/get-ad-by-id.uc';
import { ProfileStatsUc } from './application/use-cases/profile-stats.uc';
import { SellerStatsUc } from './application/use-cases/seller-stats.uc';
import { GetAdForEditUc } from './application/use-cases/get-ad-for-edit.uc';
import { UpdateAdUc } from './application/use-cases/update-ad.uc';

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

import { LegacyAdsCacheInvalidator } from './infrastructure/services/legacy-ads-cache.invalidator';

import { VehicleInventoryModule } from '../vehicle-inventory/vehicle-inventory.module';
import { MediaModule } from '../media/media.module';
import { SellModule } from '../sell/sell.module';
import { SearchModule } from '../search/search.module';
import { SuspensionGuard } from '../moderation/guards/suspension.guard';
import { UserThrottleGuard } from '../common/guards/user-throttle.guard';
import { CommercialVehicleDetectionService } from '../ads/services/commercial-vehicle-detection.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { LocationHierarchyService } from '../common/services/location-hierarchy.service';

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
import { Favorite, FavoriteSchema } from '../favorites/schemas/schema.favorite';
import { ChatRoom, ChatRoomSchema } from '../chat/schemas/chat-room.schema';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../chat/schemas/chat-message.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

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
      { name: Favorite.name, schema: FavoriteSchema },
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: 'Outbox', schema: OutboxSchema },
    ]),
    VehicleInventoryModule,
    MediaModule, // MediaService: resolve + attach mediaIds on create
    SellModule, // SellConfigService: active commercial vehicle type names
    SearchModule, // S4-lite: SearchQueryService for query understanding
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }), // Register JwtModule for JwtService
    ConfigModule, // Register ConfigModule for ConfigService
  ],
  controllers: [AdsV2Controller, LocationConfigController],
  providers: [
    // Use cases
    CreateAdUc,
    ListAdsUc,
    GetAdByIdUc,
    ProfileStatsUc,
    SellerStatsUc,
    GetAdForEditUc,
    UpdateAdUc,

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
    LegacyAdsCacheInvalidator,

    // Guards used on POST /v2/ads
    SuspensionGuard,
    UserThrottleGuard,

    // External services
    CommercialVehicleDetectionService,
    GeocodingService,
    LocationHierarchyService,
  ],
  exports: [
    // Export use cases for potential external use
    CreateAdUc,
    ListAdsUc,
    GetAdByIdUc,

    // Export services for potential external use
    IdempotencyService,
    VehicleInventoryGateway,
    OutboxService,
  ],
})
export class AdsV2Module {}