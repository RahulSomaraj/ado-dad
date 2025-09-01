import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ManufacturersController } from './manufacturers.controller';
import { ManufacturersService } from './manufacturers.service';
import { SafeManufacturerSeedService } from './seed/safe-seed-manufacturers';
import {
  Manufacturer,
  ManufacturerSchema,
} from './schemas/manufacturer.schema';
import { RedisModule } from '../shared/redis.module';
import { TestDataSafetyModule } from '../common/test-data-safety.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Manufacturer.name, schema: ManufacturerSchema },
    ]),
    RedisModule,
    TestDataSafetyModule,
  ],
  controllers: [ManufacturersController],
  providers: [ManufacturersService, SafeManufacturerSeedService],
  exports: [ManufacturersService, SafeManufacturerSeedService],
})
export class ManufacturersModule {}
