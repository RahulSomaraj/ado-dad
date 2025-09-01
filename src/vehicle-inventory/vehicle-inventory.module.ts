import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleInventoryService } from './vehicle-inventory.service';
import { VehicleInventoryController } from './vehicle-inventory.controller';
import { ManufacturersController } from './manufacturers.controller';

import { SafeFuelTypeSeedService } from './seed/safe-seed-fuel-types';
import { SafeTransmissionTypeSeedService } from './seed/safe-seed-transmission-types';
import { SafeVehicleModelSeedService } from './seed/safe-seed-vehicle-models';
import { SafeVehicleVariantSeedService } from './seed/safe-seed-vehicle-variants';
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
import {
  Manufacturer,
  ManufacturerSchema,
} from './schemas/manufacturer.schema';
import { RedisService } from '../shared/redis.service';
import { ManufacturersModule } from './manufacturers.module';
import { TestDataSafetyModule } from '../common/test-data-safety.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleModel.name, schema: VehicleModelSchema },
      { name: VehicleVariant.name, schema: VehicleVariantSchema },
      { name: FuelType.name, schema: FuelTypeSchema },
      { name: TransmissionType.name, schema: TransmissionTypeSchema },
      { name: Manufacturer.name, schema: ManufacturerSchema },
    ]),
    ManufacturersModule,
    TestDataSafetyModule,
  ],
  controllers: [VehicleInventoryController, ManufacturersController],
  providers: [
    VehicleInventoryService,
    RedisService,
    SafeFuelTypeSeedService,
    SafeTransmissionTypeSeedService,
    SafeVehicleModelSeedService,
    SafeVehicleVariantSeedService,
  ],
  exports: [
    VehicleInventoryService,
    SafeFuelTypeSeedService,
    SafeTransmissionTypeSeedService,
    SafeVehicleModelSeedService,
    SafeVehicleVariantSeedService,
  ],
})
export class VehicleInventoryModule {}
