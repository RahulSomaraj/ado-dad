import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import helmet from 'helmet';

// Configuration imports
import appConfig from './config/app.config';
import redisConfig from './config/redis.config';

// Core modules
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Feature modules
import { AdsModule } from './ads/ads.module';
import { BannerModule } from './banner/banner.module';
import { CartModule } from './cart/cart.module';
import { CategoryModule } from './category/category.module';
import { ChatModule } from './chat/chat.module';
import { FavoriteModule } from './favorites/favorite.module';
import { GatewayModule } from './gateway/gateway.module';
import { ProductModule } from './product/product.module';
import { RatingModule } from './rating/rating.module';
import { ShowroomModule } from './showroom/showroom.module';
import { UploadModule } from './shared/upload.module';
import { VehicleInventoryModule } from './vehicle-inventory/vehicle-inventory.module';
import { VehicleModule } from './vehicles/vehicle.module';

// Services
import { EmailService } from './utils/email.service';
import { RefreshTokenService } from './auth/auth.refresh.service';
import { RedisService } from './shared/redis.service';

// Schemas
import {
  AuthTokens,
  AuthTokensSchema,
} from './auth/schemas/schema.refresh-token';
import { User, UserSchema } from './users/schemas/user.schema';

// Configuration service
import { configService } from './config/mongo.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      load: [appConfig, redisConfig],
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
        Logger.log(
          `Connecting to MongoDB: ${mongoConfig.replace(/\/\/.*@/, '//***:***@')}`,
        );

        return {
          uri: mongoConfig,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
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
        secret:
          configService.get('TOKEN_KEY') ||
          'default-secret-key-change-in-production',
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
    AuthModule,
    UsersModule,
    AdsModule,
    BannerModule,
    CartModule,
    CategoryModule,
    ChatModule,
    FavoriteModule,
    GatewayModule,
    ProductModule,
    RatingModule,
    ShowroomModule,
    UploadModule,
    VehicleInventoryModule,
    VehicleModule,
  ],
  providers: [AppService, RefreshTokenService, EmailService, RedisService],
  controllers: [AppController],
  exports: [JwtModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // No restrictive middleware - allow all platforms
  }
}
