import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleInventoryService } from './vehicle-inventory.service';
import { VehicleInventoryController } from './vehicle-inventory.controller';
import { SeedDataService } from './seed/seed-data';
import { ManufacturerSeedService } from './seed/seed-manufacturers';
import { VehicleModelSeedService } from './seed/seed-vehicle-models';
import { VehicleVariantSeedService } from './seed/seed-vehicle-variants';
import {
  Manufacturer,
  ManufacturerSchema,
} from './schemas/manufacturer.schema';
import {
  VehicleModel,
  VehicleModelSchema,
} from './schemas/vehicle-model.schema';
import {
  VehicleVariant,
  VehicleVariantSchema,
} from './schemas/vehicle-variant.schema';
import { FuelType, FuelTypeSchema } from './schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeSchema,
} from './schemas/transmission-type.schema';
import { RedisService } from '../shared/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Manufacturer.name, schema: ManufacturerSchema },
      { name: VehicleModel.name, schema: VehicleModelSchema },
      { name: VehicleVariant.name, schema: VehicleVariantSchema },
      { name: FuelType.name, schema: FuelTypeSchema },
      { name: TransmissionType.name, schema: TransmissionTypeSchema },
    ]),
  ],
  controllers: [VehicleInventoryController],
  providers: [
    VehicleInventoryService,
    RedisService,
    SeedDataService,
    ManufacturerSeedService,
    VehicleModelSeedService,
    VehicleVariantSeedService,
  ],
  exports: [
    VehicleInventoryService,
    SeedDataService,
    ManufacturerSeedService,
    VehicleModelSeedService,
    VehicleVariantSeedService,
  ],
})
export class VehicleInventoryModule {}
