import { Module } from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Rating, RatingSchema } from './schemas/schema.rating'; // Your rating schema
import { RedisModule } from '../shared/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rating.name, schema: RatingSchema }]), // Registering the Rating model
    RedisModule,
  ],
  controllers: [RatingController],
  providers: [RatingService],
})
export class RatingModule {}
