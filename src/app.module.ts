import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
import { FavoriteModule } from './favorites/favorite.module'; // Correct import
import { configService } from './config/mongo.config';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { EmailService } from './utils/email.service';
import { SecurityMiddleware } from './middleware/security-middleware';

// Removed FavoriteController from the controller array because it is handled inside FavoriteModule

@Module({
  imports: [
    MongooseModule.forRoot(configService.getMongoConfig().uri as string), // Ensure it's always a string
    ConfigModule.forRoot({
      load: [appConfig],
      isGlobal: true,
      // envFilePath: join(os.homedir(), 'newshop', `.env`),
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
      .apply(SecurityMiddleware)  // Apply middleware here
      .forRoutes('*');  // Apply to all routes or specify particular controllers
  }
}
