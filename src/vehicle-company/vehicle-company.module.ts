import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleCompanyService } from './vehicle-company.service';
import { VehicleCompanyController } from './vehicle-company.controller';
import { VehicleCompany, VehicleCompanySchema } from './schemas/schema.vehicle-company';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VehicleCompany.name, schema: VehicleCompanySchema }]), // ✅ Register model
  ],
  controllers: [VehicleCompanyController],
  providers: [VehicleCompanyService],
  exports: [VehicleCompanyService], // ✅ Export if needed elsewhere
})
export class VehicleCompanyModule {}
