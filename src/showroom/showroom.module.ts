import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowroomController } from './showroom.controller';
import { ShowroomService } from './showroom.service';
import { Showroom, ShowroomSchema } from './schemas/showroom.schema';
import { RedisService } from '../shared/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Showroom.name, schema: ShowroomSchema },
    ]),
  ],
  controllers: [ShowroomController],
  providers: [ShowroomService, RedisService],
})
export class ShowroomModule {}
