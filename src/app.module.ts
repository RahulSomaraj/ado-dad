import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { VehicleModule } from './vehicles/vehicle.module';
import { ShowroomModule } from './showroom/showroom.module';
import { CartModule } from './cart/cart.module';
import { ProductModule } from './product/product.module'; // Import ProductModule
import { EmailService } from './utils/email.service';
import { AdvertisementsModule } from './advertisement/advertisement.module';
import { BannerModule } from './banner/banner.module'; // Import BannerModule
import { CategoryController } from './category/category.controller';
import { CategoryModule } from './category/category.module';
import { VehicleCompanyModule } from './vehicle-company/vehicle-company.module';
import { VendorController } from './vendor/vendor.controller';
import { VendorModule } from './vendor/vendor.module';
import { ModelService } from './model/model.service';
import { ModelController } from './model/model.controller';
import { ModelModule } from './model/model.module';
import { RatingModule } from './rating/rating.module';
import { PropertyService } from './property/property.service';
import { PropertyController } from './property/property.controller';
import { PropertyModule } from './property/property.module';
import { FavoriteModule } from './favorites/favorite.module'; // Correct import
import { configService } from './config/mongo.config';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';

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
    FavoriteModule, // Ensures FavoriteController is registered via FavoriteModule
  ],
  providers: [EmailService],
  controllers: [
    CategoryController,
    VendorController,
    ModelController,
    PropertyController,
  ],
})
export class AppModule {}
