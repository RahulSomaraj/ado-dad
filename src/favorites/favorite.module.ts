import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoriteSchema } from './schemas/schema.favorite';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';
import { AdsModule } from '../ads/ads.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Favorite', schema: FavoriteSchema }]),
    AdsModule,
  ],
  providers: [FavoriteService],
  controllers: [FavoriteController],
  exports: [FavoriteService],
})
export class FavoriteModule {}
