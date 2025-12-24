import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelService } from './model.service';
import { ModelController } from './model.controller';
import { ModelSchema } from './schemas/schema.model';
import { VehicleCompanySchema, VehicleCompany } from '../vehicle-company/schemas/schema.vehicle-company';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Model', schema: ModelSchema }]),
    MongooseModule.forFeature([{ name: VehicleCompany.name, schema: VehicleCompanySchema }]), // Register VehicleCompany schema for population
  ],
  controllers: [ModelController],
  providers: [ModelService],
  exports: [ModelService],
})
export class ModelModule {}
