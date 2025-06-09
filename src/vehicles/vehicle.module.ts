import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import {
  VehicleCompany,
  VehicleCompanySchema,
} from 'src/vehicle-company/schemas/schema.vehicle-company';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: VehicleCompany.name, schema: VehicleCompanySchema },
    ]),
  ],
  providers: [VehicleService],
  controllers: [VehicleController],
})
export class VehicleModule {}