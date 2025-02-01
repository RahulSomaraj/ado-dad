import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { VehicleModule } from './vehicles/vehicle.module';
import { ShowroomModule } from './showroom/showroom.module';
import { CartModule } from './cart/cart.module';
import { ProductModule } from './product/product.module';
import { AdvertisementsModule } from './advertisement/advertisement.module';
import { BannerModule } from './banner/banner.module';
import { CategoryController } from './category/category.controller';
import { CategoryModule } from './category/category.module';
import { VehicleCompanyModule } from './vehicle-company/vehicle-company.module';
import { VendorController } from './vendor/vendor.controller';
import { VendorModule } from './vendor/vendor.module';
import { ModelController } from './model/model.controller';
import { ModelModule } from './model/model.module';
import { RatingModule } from './rating/rating.module';
import { PropertyController } from './property/property.controller';
import { PropertyModule } from './property/property.module';
import { FavoriteModule } from './favorites/favorite.module';
import { EmailService } from './utils/email.service';
import { configService } from './config/mongo.config';
import appConfig from './config/app.config';
import helmet from 'helmet';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig],
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      useFactory: () => {
        const mongoConfig = configService.getMongoConfig();
        console.log('Applying MongoDB configuration:', mongoConfig);
        return mongoConfig;
      },
    }),

    UsersModule,
    VehicleModule,
    ShowroomModule,
    CartModule,
    ProductModule,
    AdvertisementsModule,
    BannerModule,
    CategoryModule,
    VehicleCompanyModule,
    VendorModule,
    ModelModule,
    RatingModule,
    PropertyModule,
    FavoriteModule,
  ],
  providers: [EmailService],
  controllers: [
    CategoryController,
    VendorController,
    ModelController,
    PropertyController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(helmet()) // ✅ Apply Helmet & CORS
      .forRoutes('*'); // ✅ Correct
  }
}
