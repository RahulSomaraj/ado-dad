import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleAdvController } from './vehicleadv.controller';
import { VehicleAdvService } from './vehicleadv.service';
import { VehicleAdv, VehicleAdvSchema } from './schemas/vehicleadv.schema';
import {
  VehicleCompany,
  VehicleCompanySchema,
} from 'src/vehicle-company/schemas/schema.vehicle-company';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleAdv.name, schema: VehicleAdvSchema },
    ]),
    MongooseModule.forFeature([
      { name: VehicleCompany.name, schema: VehicleCompanySchema },
    ]),
  ],
  controllers: [VehicleAdvController],
  providers: [VehicleAdvService],
})
export class VehicleAdvModule {}
