import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoriteSchema } from './schemas/schema.favorite';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';
import { RedisService } from '../shared/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Favorite', schema: FavoriteSchema }]),
  ],
  providers: [FavoriteService, RedisService],
  controllers: [FavoriteController],
  exports: [FavoriteService],
})
export class FavoriteModule {}
