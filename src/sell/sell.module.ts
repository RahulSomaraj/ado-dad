import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FuelType,
  FuelTypeSchema,
} from '../vehicle-inventory/schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeSchema,
} from '../vehicle-inventory/schemas/transmission-type.schema';
import {
  CommercialVehicleType,
  CommercialVehicleTypeSchema,
} from '../vehicle-inventory/schemas/commercial-vehicle-type.schema';
import { SellController } from './sell.controller';
import { SellConfigService } from './sell-config.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FuelType.name, schema: FuelTypeSchema },
      { name: TransmissionType.name, schema: TransmissionTypeSchema },
      { name: CommercialVehicleType.name, schema: CommercialVehicleTypeSchema },
    ]),
  ],
  controllers: [SellController],
  providers: [SellConfigService],
  exports: [SellConfigService],
})
export class SellModule {}
