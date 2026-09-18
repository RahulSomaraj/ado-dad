import { APP_GUARD } from '@nestjs/core';
import { AuthThrottleGuard } from './common/guards/auth-throttle.guard';
import { getJwtSecret } from './common/jwt-secret.util';
import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import helmet from 'helmet';

// Configuration imports
import appConfig from './config/app.config';
import redisConfig from './config/redis.config';
import fcmConfig from './config/fcm.config';

// Core modules
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Feature modules
import { AdsModule } from './ads/ads.module';
import { AdsV2Module } from './ads-v2/ads.v2.module';
import { BannerModule } from './banner/banner.module';
import { CartModule } from './cart/cart.module';
import { CategoryModule } from './category/category.module';
import { FavoriteModule } from './favorites/favorite.module';
import { ProductModule } from './product/product.module';
import { RatingModule } from './rating/rating.module';
import { ShowroomModule } from './showroom/showroom.module';
import { UploadModule } from './shared/upload.module';
import { VehicleInventoryModule } from './vehicle-inventory/vehicle-inventory.module';
import { VehicleModule } from './vehicles/vehicle.module';
import { ChatModule } from './chat/chat.module';
import { UserReportModule } from './users/user-report.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppVersionModule } from './app-version/app-version.module';
import { SearchModule } from './search/search.module';
import { describeTarget } from './common/database/db-safety.util';

// Services
import { EmailService } from './utils/email.service';
import { RefreshTokenService } from './auth/auth.refresh.service';
import { RedisModule } from './shared/redis.module';

// Schemas
import {
  AuthTokens,
  AuthTokensSchema,
} from './auth/schemas/schema.refresh-token';
import { User, UserSchema } from './users/schemas/user.schema';

// Configuration service
import { configService } from './config/mongo.config';
import { ModerationModule } from './moderation/moderation.module';
import { SellModule } from './sell/sell.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      load: [appConfig, redisConfig, fcmConfig],
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoConfig =
          configService.get('MONGO_URI') || 'mongodb://localhost:27017/ado-dad';
        const target = describeTarget(mongoConfig);

        Logger.log(
          `Connecting to MongoDB: ${target.redactedUri} ` +
            `[${target.environment}: ${target.reason}]`,
        );

        /**
         * SAFETY (S-PROD-1): Mongoose builds every `schema.index()` declaration
         * automatically on boot when `autoIndex` is left at its default of true.
         * With this checkout routinely pointed at production, that means a merged
         * schema edit is enough to start an index build on a live collection —
         * no script, no review, no chance to pick the window. On `ads` that is a
         * long, IO-heavy build, and for a text index it fails outright because
         * Mongo allows only one per collection.
         *
         * Indexes are therefore created deliberately, by migration scripts, on
         * every environment that is not local. Set MONGO_AUTO_INDEX=true to opt
         * back in for a local database.
         */
        const autoIndex =
          (process.env.MONGO_AUTO_INDEX ?? '').toLowerCase() === 'true' ||
          target.environment === 'local';

        if (!autoIndex) {
          Logger.log(
            'Mongoose autoIndex is DISABLED — indexes are managed by migration scripts ' +
              '(npm run search:indexes). Set MONGO_AUTO_INDEX=true only for a local database.',
          );
        } else {
          Logger.warn(
            `Mongoose autoIndex is ENABLED against "${target.database}". ` +
              'Schema index changes will build on boot.',
          );
        }

        return {
          uri: mongoConfig,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
          autoIndex,
          // Creating a collection implicitly is harmless, but it follows
          // autoIndex by default in Mongoose 6+; keep them explicit and aligned.
          autoCreate: autoIndex,
        };
      },
      inject: [ConfigService],
    }),

    // Feature schemas
    MongooseModule.forFeature([
      { name: AuthTokens.name, schema: AuthTokensSchema },
      { name: User.name, schema: UserSchema },
    ]),

    // JWT Configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getJwtSecret(),
        signOptions: {
          expiresIn: configService.get('ACCESS_TOKEN_EXPIRY') || '1h',
          issuer: 'ado-dad-api',
          audience: 'ado-dad-users',
        },
        verifyOptions: {
          issuer: 'ado-dad-api',
          audience: 'ado-dad-users',
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    MulterModule.register({ storage: memoryStorage() }),
    AuthModule,
    UsersModule,
    UserReportModule,
    AdsModule,
    AdsV2Module,
    BannerModule,
    CartModule,
    CategoryModule,
    ChatModule,
    FavoriteModule,
    ProductModule,
    RatingModule,
    ShowroomModule,
    UploadModule,
    VehicleInventoryModule,
    VehicleModule,
    NotificationsModule,
    AppVersionModule,
    ModerationModule,
    SellModule, // CREATE-06: GET /v2/sell/config
    MediaModule, // CREATE-06: POST /v2/media/intents, /:id/complete
    SearchModule, // S1/S2: query-understanding lexicon + parser (no routes yet)
    RedisModule,
  ],
  providers: [
    AppService,
    RefreshTokenService,
    EmailService,
    { provide: APP_GUARD, useClass: AuthThrottleGuard },
  ],
  controllers: [AppController],
  exports: [JwtModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // No restrictive middleware - allow all platforms
  }
}
