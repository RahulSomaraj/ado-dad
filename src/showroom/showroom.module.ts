import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowroomController } from './showroom.controller';
import { ShowroomService } from './showroom.service';
import { Showroom, ShowroomSchema } from './schemas/showroom.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Showroom.name, schema: ShowroomSchema }]),
  ],
  controllers: [ShowroomController],
  providers: [ShowroomService],
})
export class ShowroomModule {}
