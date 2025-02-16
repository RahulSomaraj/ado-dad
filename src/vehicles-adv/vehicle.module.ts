import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleAdvController } from './vehicle.controller';
import { VehicleAdvService } from './vehicle.service';
import { VehicleAdv, VehicleAdvSchema } from './schemas/vehicle.schema';
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
