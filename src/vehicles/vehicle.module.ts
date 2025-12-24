import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleController } from './vehicle.controller';
import { VehicleVariantController } from './vehicle-variant.controller';
import { VehicleService } from './vehicle.service';
import { VehicleVariantService } from './vehicle-variant.service';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { VehicleVariant, VehicleVariantSchema } from './schemas/vehicle-variant.schema';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { ModelSchema } from '../model/schemas/schema.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    MongooseModule.forFeature([{ name: VehicleVariant.name, schema: VehicleVariantSchema }]),
    MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]),
    MongooseModule.forFeature([{ name: 'Model', schema: ModelSchema }]), // Register Model schema for population
  ],
  controllers: [VehicleController, VehicleVariantController],
  providers: [VehicleService, VehicleVariantService],
  exports: [VehicleService, VehicleVariantService],
})
export class VehicleModule {}
