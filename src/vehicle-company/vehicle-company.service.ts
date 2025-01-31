import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleCompany } from './schemas/schema.vehicle-company';

@Injectable()
export class VehicleCompanyService {
  constructor(
    @InjectModel(VehicleCompany.name) private readonly vehicleCompanyModel: Model<VehicleCompany>, // ✅ Inject Model
  ) {}

  async create(data: any): Promise<VehicleCompany> {
    const newCompany = new this.vehicleCompanyModel(data);
    return newCompany.save();
  }

  async findAll(): Promise<VehicleCompany[]> {
    return this.vehicleCompanyModel.find().exec();
  }

  async findOne(id: string): Promise<VehicleCompany | null> {
    return this.vehicleCompanyModel.findById(id).exec();
  }

  async update(id: string, data: any): Promise<VehicleCompany | null> {
    return this.vehicleCompanyModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async remove(id: string): Promise<VehicleCompany | null> {
    return this.vehicleCompanyModel.findByIdAndDelete(id).exec();
  }
}
