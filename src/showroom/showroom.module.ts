import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowroomController } from './showroom.controller';
import { ShowroomService } from './showroom.service';
import { Showroom, ShowroomSchema } from './schemas/showroom.schema';
import { RedisModule } from '../shared/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Showroom.name, schema: ShowroomSchema },
    ]),
    RedisModule,
  ],
  controllers: [ShowroomController],
  providers: [ShowroomService],
})
export class ShowroomModule {}
